import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "@nestjs/authentication";
import { Can } from "@nestjs/authorization";
import { FileInterceptor } from "@nestjs/platform-node";
import { API_ROUTES, asRoute, PERMISSIONS } from "../shared";
import type { Prisma } from "../generated/prisma/client";
import { Audit } from "../audit/audit.decorator";
import { RateLimit } from "../common/decorators/rate-limit.decorator";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { RequirePermission } from "../auth/decorators/permission.decorator";
import { TenantMembershipGuard } from "../auth/guards/tenant-membership.guard";
import { TenantTx } from "../tenancy/decorators/tenant-tx.decorator";
import { TenantTransactionInterceptor } from "../tenancy/interceptors/tenant-transaction.interceptor";
import {
  FileListResponseDto,
  FileResponseDto,
} from "./dto/file-response.dto";
import { QueryFilesDto } from "./dto/query-files.dto";
import type { UploadFile } from "./files.types";
import { FilesService } from "./files.service";

const MAX_UPLOAD_BYTES =
  Number(process.env.FILES_MAX_SIZE_MB ?? 20) * 1024 * 1024;

const contentDisposition = (fileName: string): string => {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

/**
 * 租户文件（/t/:tenantId/files）。
 *
 * - 列表 / 下载：file:read；上传 / 删除：file:write
 * - 元数据在 PostgreSQL（files，受 RLS 保护），内容由 FileStorage 保存
 * - 下载强制 attachment + nosniff，避免上传的 HTML/SVG 在内联浏览时执行
 */
@ApiTags("files")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@UseGuards(TenantMembershipGuard)
@Controller(asRoute(`${API_ROUTES.tenant}${API_ROUTES.tenantFiles}`))
export class TenantFilesController {
  constructor(private readonly files: FilesService) {}

  @ApiOperation({ summary: "文件列表（分页 / 文件名搜索 / 类型筛选）" })
  @ApiOkResponse({ type: FileListResponseDto })
  @Get()
  @UseInterceptors(TenantTransactionInterceptor)
  @RequirePermission(PERMISSIONS.fileRead)
  @Can.Anyone()
  list(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Query() query: QueryFilesDto,
  ): Promise<FileListResponseDto> {
    return this.files.list(tx, tenantId, query);
  }

  @ApiOperation({ summary: "上传文件（multipart，字段名 file）" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiCreatedResponse({ type: FileResponseDto })
  @Post()
  @RequirePermission(PERMISSIONS.fileWrite)
  @Can.Anyone()
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      defParamCharset: "utf8",
    }),
    TenantTransactionInterceptor,
  )
  @Audit({
    action: "file.upload",
    resource: "file",
    resourceId: (data) => (data as FileResponseDto | undefined)?.id ?? null,
  })
  upload(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: UploadFile | undefined,
  ): Promise<FileResponseDto> {
    return this.files.upload(tx, tenantId, user.id, file);
  }

  @ApiOperation({ summary: "下载文件内容（始终 attachment）" })
  @ApiOkResponse({ description: "文件二进制内容" })
  @Get(":id/content")
  @UseInterceptors(TenantTransactionInterceptor)
  @RequirePermission(PERMISSIONS.fileRead)
  @Can.Anyone()
  async content(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.files.content(tx, tenantId, id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.buffer.length);
    res.setHeader("Content-Disposition", contentDisposition(file.fileName));
    res.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(file.buffer);
  }

  @ApiOperation({ summary: "删除文件（元数据 + 存储内容）" })
  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete(":id")
  @UseInterceptors(TenantTransactionInterceptor)
  @RequirePermission(PERMISSIONS.fileWrite)
  @Can.Anyone()
  @Audit({
    action: "file.delete",
    resource: "file",
    recordResult: false,
    resourceId: (_data, req) => req.params.id ?? null,
  })
  remove(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.files.remove(tx, tenantId, id);
  }
}
