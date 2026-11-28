import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import type { FileCategory, QueryFilesDto } from "../dto/query-files.dto";

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/json",
  "text/csv",
  "text/markdown",
  "text/plain",
] as const;

const categoryWhere = (
  category: FileCategory | undefined,
): Prisma.StoredFileWhereInput => {
  if (!category) return {};
  if (category === "image") return { mimeType: { startsWith: "image/" } };

  const document: Prisma.StoredFileWhereInput = {
    OR: [
      { mimeType: { startsWith: "text/" } },
      { mimeType: { in: [...DOCUMENT_MIME_TYPES] } },
    ],
  };
  if (category === "document") return document;

  return {
    NOT: [
      { mimeType: { startsWith: "image/" } },
      { mimeType: { startsWith: "text/" } },
      { mimeType: { in: [...DOCUMENT_MIME_TYPES] } },
    ],
  };
};

const uploadedBySelect = {
  select: { displayName: true, email: true },
} as const;

@Injectable()
export class FilesRepository {
  async list(
    tx: Prisma.TransactionClient,
    tenantId: string,
    query: QueryFilesDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.StoredFileWhereInput = {
      tenantId,
      ...(query.keyword
        ? { originalName: { contains: query.keyword, mode: "insensitive" } }
        : {}),
      ...categoryWhere(query.category),
    };

    const [total, rows] = await Promise.all([
      tx.storedFile.count({ where }),
      tx.storedFile.findMany({
        where,
        include: { uploadedBy: uploadedBySelect },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, rows, page, pageSize };
  }

  findById(tx: Prisma.TransactionClient, tenantId: string, id: string) {
    return tx.storedFile.findFirst({
      where: { id, tenantId },
      include: { uploadedBy: uploadedBySelect },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.StoredFileUncheckedCreateInput,
  ) {
    return tx.storedFile.create({
      data,
      include: { uploadedBy: uploadedBySelect },
    });
  }

  async remove(tx: Prisma.TransactionClient, tenantId: string, id: string) {
    const result = await tx.storedFile.deleteMany({ where: { id, tenantId } });
    return result.count > 0;
  }
}
