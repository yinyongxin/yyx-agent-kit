import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client";

const ROLE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } },
  permissions: {
    select: { permission: { select: { code: true } } },
  },
} satisfies Prisma.RoleSelect;

export type RoleRow = Prisma.RoleGetPayload<{ select: typeof ROLE_SELECT }>;

/**
 * 租户角色数据访问。
 *
 * Role 带 tenantId，受 RLS 保护，必须使用调用方传入的租户事务客户端；
 * 查询额外显式带 tenantId（RLS 之外的业务约束）。
 * RolePermission / UserRole 无 tenantId，只能在已确认 role 属于当前租户后按 roleId 操作。
 */
@Injectable()
export class RolesRepository {
  async list(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      skip: number;
      take: number;
      kind?: "system" | "custom";
      keyword?: string;
    },
  ): Promise<{ rows: RoleRow[]; total: number }> {
    const where: Prisma.RoleWhereInput = {
      tenantId: params.tenantId,
      ...(params.kind ? { isSystem: params.kind === "system" } : {}),
      ...(params.keyword
        ? {
            OR: [
              { name: { contains: params.keyword, mode: "insensitive" } },
              { code: { contains: params.keyword, mode: "insensitive" } },
              { description: { contains: params.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      tx.role.findMany({
        where,
        orderBy: [{ isSystem: "desc" }, { code: "asc" }],
        skip: params.skip,
        take: params.take,
        select: ROLE_SELECT,
      }),
      tx.role.count({ where }),
    ]);

    return { rows, total };
  }

  findById(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<RoleRow | null> {
    return tx.role.findFirst({
      where: { id, tenantId },
      select: ROLE_SELECT,
    });
  }

  findByCode(tx: Prisma.TransactionClient, tenantId: string, code: string) {
    return tx.role.findUnique({
      where: { tenantId_code: { tenantId, code } },
      select: { id: true },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: {
      tenantId: string;
      code: string;
      name: string;
      description: string | null;
    },
  ): Promise<RoleRow> {
    return tx.role.create({
      data: { ...data, isSystem: false },
      select: ROLE_SELECT,
    });
  }

  update(
    tx: Prisma.TransactionClient,
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<RoleRow> {
    return tx.role.update({ where: { id }, data, select: ROLE_SELECT });
  }

  async remove(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.role.delete({ where: { id } });
  }

  countUsers(tx: Prisma.TransactionClient, roleId: string): Promise<number> {
    return tx.userRole.count({ where: { roleId } });
  }

  options(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<{ id: string; code: string; name: string }[]> {
    return tx.role.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
  }

  findPermissionsByCodes(tx: Prisma.TransactionClient, codes: string[]) {
    return tx.permission.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
  }

  /** 整体替换角色权限；只按 roleId 操作，调用前必须确认 role 属于当前租户 */
  async replacePermissions(
    tx: Prisma.TransactionClient,
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length === 0) return;
    await tx.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    });
  }
}
