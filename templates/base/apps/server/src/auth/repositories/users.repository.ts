import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { User } from "../user.types";

/**
 * 官方 @nestjs/authentication 不读用户表，只通过本类拿用户。
 * 密码哈希留在仓库内部，对外只返回不含敏感字段的 User（见官方文档 Quick Start）。
 *
 * 注意：User 是全局身份表（UNSCOPED），这里不能用 tenantId 过滤——
 * 登录时还没有租户上下文，强制 scoped 会抛「上下文缺失」。
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.scoped.user.findFirst({
      where: { id, status: "active" },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
      },
    }) as Promise<User | null>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.scoped.user.findFirst({
      where: { email, status: "active" },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
      },
    }) as Promise<User | null>;
  }

  /** 当前用户所属的活跃租户，供租户切换器使用。UserTenant 是 UNSCOPED 授权关系表。 */
  async findTenants(userId: string) {
    const rows = await this.prisma.scoped.userTenant.findMany({
      where: {
        userId,
        status: "active",
        tenant: { status: "active", deletedAt: null },
      },
      select: {
        joinedAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return rows.map((row) => ({
      id: row.tenant.id,
      name: row.tenant.name,
      slug: row.tenant.slug,
      joinedAt: row.joinedAt,
    }));
  }

  /** 当前用户资料 + 是否平台管理员（/me） */
  async findProfile(userId: string) {
    const row = await this.prisma.scoped.user.findFirst({
      where: { id: userId, status: "active" },
      select: {
        id: true,
        email: true,
        displayName: true,
        platformAdmin: { select: { level: true } },
      },
    });
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      isPlatformAdmin: Boolean(row.platformAdmin),
    };
  }

  /** 登录专用：取密码哈希。User 是 UNSCOPED 全局表，无租户上下文也能查。 */
  async findCredentials(
    email: string,
  ): Promise<{ user: User; passwordHash: string | null } | null> {
    const row = await this.prisma.scoped.user.findFirst({
      where: { email, status: "active" },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        passwordHash: true,
      },
    });
    if (!row) return null;

    return {
      user: {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        status: row.status,
      } as User,
      passwordHash: row.passwordHash,
    };
  }
}
