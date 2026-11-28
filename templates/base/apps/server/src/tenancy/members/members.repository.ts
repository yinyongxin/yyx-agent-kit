import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";

/** 成员行：全局 User 信息 + 当前租户的成员状态 */
const MEMBER_SELECT = {
  userId: true,
  status: true,
  joinedAt: true,
  user: {
    select: {
      email: true,
      displayName: true,
      status: true,
    },
  },
} satisfies Prisma.UserTenantSelect;

export type MemberRow = Prisma.UserTenantGetPayload<{ select: typeof MEMBER_SELECT }>;

export type MemberRoleRow = {
  userId: string;
  role: { id: string; code: string; name: string };
};

/**
 * 租户成员数据访问。
 *
 * `UserTenant` / `User` 是全局表（无 tenantId，RLS 不覆盖），查询必须显式带 tenantId；
 * `UserRole` 无 tenantId 列，角色必须通过 `role.tenantId` 收窄，避免带出其它租户的角色。
 * 所有方法都使用调用方传入的租户事务客户端（Interceptor 已设置 app.tenant_id）。
 */
@Injectable()
export class MembersRepository {
  async list(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      skip: number;
      take: number;
      status?: "active" | "suspended";
      keyword?: string;
    },
  ): Promise<{ rows: MemberRow[]; total: number; roles: MemberRoleRow[] }> {
    const where: Prisma.UserTenantWhereInput = {
      tenantId: params.tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.keyword
        ? {
            user: {
              OR: [
                { email: { contains: params.keyword, mode: "insensitive" } },
                { displayName: { contains: params.keyword, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      tx.userTenant.findMany({
        where,
        orderBy: { joinedAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: MEMBER_SELECT,
      }),
      tx.userTenant.count({ where }),
    ]);

    return {
      rows,
      total,
      roles: await this.findRolesForUsers(
        tx,
        params.tenantId,
        rows.map((row) => row.userId),
      ),
    };
  }

  findMembership(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ): Promise<MemberRow | null> {
    return tx.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: MEMBER_SELECT,
    });
  }

  findUserByEmail(tx: Prisma.TransactionClient, email: string) {
    return tx.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, status: true },
    });
  }

  findRolesByCodes(
    tx: Prisma.TransactionClient,
    tenantId: string,
    codes: string[],
  ) {
    return tx.role.findMany({
      where: { tenantId, code: { in: codes } },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
  }

  findRolesForUser(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ) {
    return tx.userRole
      .findMany({
        where: { userId, role: { tenantId } },
        select: { role: { select: { id: true, code: true, name: true } } },
        orderBy: { role: { code: "asc" } },
      })
      .then((rows) => rows.map((row) => row.role));
  }

  private async findRolesForUsers(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userIds: string[],
  ): Promise<MemberRoleRow[]> {
    if (userIds.length === 0) return [];
    return tx.userRole.findMany({
      where: { userId: { in: userIds }, role: { tenantId } },
      select: {
        userId: true,
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { role: { code: "asc" } },
    });
  }

  async createMembership(
    tx: Prisma.TransactionClient,
    data: {
      tenantId: string;
      userId: string;
      status: "active" | "suspended";
      roleIds: string[];
    },
  ): Promise<void> {
    await tx.userTenant.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        status: data.status,
      },
    });
    await this.createUserRoles(tx, data.userId, data.roleIds);
  }

  updateMembership(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    data: { status?: "active" | "suspended" },
  ): Promise<MemberRow> {
    return tx.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data,
      select: MEMBER_SELECT,
    });
  }

  /** 整体替换成员在本租户的角色；只动当前租户的角色，不影响其在其它租户的角色 */
  async replaceRoles(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    roleIds: string[],
  ): Promise<void> {
    const tenantRoles = await tx.role.findMany({
      where: { tenantId },
      select: { id: true },
    });
    if (tenantRoles.length > 0) {
      await tx.userRole.deleteMany({
        where: { userId, roleId: { in: tenantRoles.map((role) => role.id) } },
      });
    }
    await this.createUserRoles(tx, userId, roleIds);
  }

  async removeMembership(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const tenantRoles = await tx.role.findMany({
      where: { tenantId },
      select: { id: true },
    });
    if (tenantRoles.length > 0) {
      await tx.userRole.deleteMany({
        where: { userId, roleId: { in: tenantRoles.map((role) => role.id) } },
      });
    }
    await tx.userTenant.delete({
      where: { userId_tenantId: { userId, tenantId } },
    });
  }

  private async createUserRoles(
    tx: Prisma.TransactionClient,
    userId: string,
    roleIds: string[],
  ): Promise<void> {
    if (roleIds.length === 0) return;
    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
  }
}
