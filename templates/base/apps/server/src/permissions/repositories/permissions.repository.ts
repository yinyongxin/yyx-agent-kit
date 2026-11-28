import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const PERMISSION_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { roles: true } },
} satisfies Prisma.PermissionSelect;

export type PermissionRow = Prisma.PermissionGetPayload<{
  select: typeof PERMISSION_SELECT;
}>;

/**
 * 权限点是全局表（无 tenantId），走 `prisma.scoped` 读取。
 * `_count.roles` 统计的是 RolePermission 关联行数，用来阻止删除仍被角色引用的权限点。
 */
@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(params: {
    skip: number;
    take: number;
    keyword?: string;
  }): Promise<{ rows: PermissionRow[]; total: number }> {
    const where: Prisma.PermissionWhereInput = params.keyword
      ? {
          OR: [
            { code: { contains: params.keyword, mode: "insensitive" } },
            { name: { contains: params.keyword, mode: "insensitive" } },
            { description: { contains: params.keyword, mode: "insensitive" } },
          ],
        }
      : {};

    return Promise.all([
      this.prisma.scoped.permission.findMany({
        where,
        orderBy: { code: "asc" },
        skip: params.skip,
        take: params.take,
        select: PERMISSION_SELECT,
      }),
      this.prisma.scoped.permission.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  findById(id: string): Promise<PermissionRow | null> {
    return this.prisma.scoped.permission.findUnique({
      where: { id },
      select: PERMISSION_SELECT,
    });
  }

  findByCode(code: string) {
    return this.prisma.scoped.permission.findUnique({
      where: { code },
      select: { id: true },
    });
  }

  create(data: {
    code: string;
    name: string;
    description: string | null;
  }): Promise<PermissionRow> {
    return this.prisma.scoped.permission.create({
      data,
      select: PERMISSION_SELECT,
    });
  }

  update(
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<PermissionRow> {
    return this.prisma.scoped.permission.update({
      where: { id },
      data,
      select: PERMISSION_SELECT,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.scoped.permission.delete({ where: { id } });
  }
}
