import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import type {
  FileListResponseDto,
  FileResponseDto,
} from "./dto/file-response.dto";
import type { QueryFilesDto } from "./dto/query-files.dto";
import type { UploadFile } from "./files.types";
import { FilesRepository } from "./repositories/files.repository";
import { FILE_STORAGE, type FileStorage } from "./storage/file-storage";

/** 允许上传的 MIME 类型；SVG / HTML 等可执行内容默认拒绝，避免存储型 XSS。 */
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
]);

type FileRow = Prisma.StoredFileGetPayload<{
  include: { uploadedBy: { select: { displayName: true; email: true } } };
}>;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxSizeBytes: number;

  constructor(
    private readonly files: FilesRepository,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    config: ConfigService,
  ) {
    this.maxSizeBytes =
      config.getOrThrow<number>("files.maxSizeMb") * 1024 * 1024;
  }

  async list(
    tx: Prisma.TransactionClient,
    tenantId: string,
    query: QueryFilesDto,
  ): Promise<FileListResponseDto> {
    const { rows, total, page, pageSize } = await this.files.list(
      tx,
      tenantId,
      query,
    );
    return { items: rows.map((row) => this.toDto(row)), total, page, pageSize };
  }

  async upload(
    tx: Prisma.TransactionClient,
    tenantId: string,
    uploadedById: string,
    file: UploadFile | undefined,
  ): Promise<FileResponseDto> {
    if (!file) throw new BadRequestException("请选择要上传的文件");
    if (file.size === 0) throw new BadRequestException("不能上传空文件");
    if (file.size > this.maxSizeBytes) {
      throw new PayloadTooLargeException(
        `文件超过 ${Math.round(this.maxSizeBytes / 1024 / 1024)}MB 上限`,
      );
    }

    const mimeType = file.mimetype.toLowerCase().split(";")[0]?.trim() ?? "";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`不支持的文件类型：${mimeType || "未知"}`);
    }

    const now = new Date();
    const storageKey = [
      tenantId,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      randomUUID(),
    ].join("/");
    const checksum = createHash("sha256").update(file.buffer).digest("hex");

    await this.storage.put(storageKey, file.buffer);
    try {
      const row = await this.files.create(tx, {
        tenantId,
        originalName: file.originalname.slice(0, 255),
        storageKey,
        mimeType,
        size: file.size,
        checksum,
        uploadedById,
      });
      return this.toDto(row);
    } catch (error) {
      // 元数据写入失败时回收刚写入的内容，避免产生孤儿文件
      await this.storage.delete(storageKey).catch((cleanupError: unknown) => {
        this.logger.warn(
          `清理孤儿文件失败 key=${storageKey}: ${String(cleanupError)}`,
        );
      });
      throw error;
    }
  }

  async content(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<{ fileName: string; mimeType: string; buffer: Buffer }> {
    const row = await this.files.findById(tx, tenantId, id);
    if (!row) throw new NotFoundException("文件不存在");

    try {
      const buffer = await this.storage.get(row.storageKey);
      return { fileName: row.originalName, mimeType: row.mimeType, buffer };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new NotFoundException("文件内容不存在");
      }
      throw error;
    }
  }

  async remove(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<void> {
    const row = await this.files.findById(tx, tenantId, id);
    if (!row) throw new NotFoundException("文件不存在");

    await this.files.remove(tx, tenantId, id);
    await this.storage.delete(row.storageKey).catch((error: unknown) => {
      this.logger.warn(
        `删除文件内容失败 key=${row.storageKey}: ${String(error)}`,
      );
    });
  }

  private toDto(row: FileRow): FileResponseDto {
    return {
      id: row.id,
      name: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      checksum: row.checksum,
      uploadedById: row.uploadedById,
      uploadedByName:
        row.uploadedBy?.displayName ?? row.uploadedBy?.email ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
