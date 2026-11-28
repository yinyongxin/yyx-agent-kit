import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/** 用户对外字段：不含 passwordHash / authSubject */
const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tenants: true } },
} satisfies Prisma.UserSelect;

export type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(params: {
    skip: number;
    take: number;
    status?: "active" | "disabled";
    keyword?: string;
  }) {
    const where: Prisma.UserWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.keyword
        ? {
            OR: [
              { email: { contains: params.keyword, mode: "insensitive" } },
              { displayName: { contains: params.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.scoped.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: USER_SELECT,
      }),
      this.prisma.scoped.user.count({ where }),
    ]);
  }

  findById(id: string): Promise<UserRow | null> {
    return this.prisma.scoped.user.findUnique({ where: { id }, select: USER_SELECT });
  }

  findByEmail(email: string) {
    return this.prisma.scoped.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
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
      platformAdminLevel: row.platformAdmin?.level ?? null,
    };
  }

  /** 当前用户所属的活跃租户，供 /me/tenants 与租户切换器使用 */
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

  create(data: {
    authSubject: string;
    email: string;
    displayName: string | null;
    passwordHash: string;
    status: "active" | "disabled";
  }): Promise<UserRow> {
    return this.prisma.scoped.user.create({ data, select: USER_SELECT });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<UserRow> {
    return this.prisma.scoped.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.scoped.user.delete({ where: { id } });
  }
}
