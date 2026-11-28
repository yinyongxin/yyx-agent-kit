import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(params: {
    skip: number;
    take: number;
    status?: "active" | "suspended";
    keyword?: string;
  }) {
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.keyword
        ? {
            OR: [
              { name: { contains: params.keyword, mode: "insensitive" } },
              { slug: { contains: params.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.scoped.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.scoped.tenant.count({ where }),
    ]);
  }

  findById(id: string) {
    return this.prisma.scoped.tenant.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.scoped.tenant.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  create(data: { name: string; slug: string }) {
    return this.prisma.scoped.tenant.create({ data });
  }

  /** 事务内创建租户：与角色初始化、初始管理员同一事务 */
  createInTx(
    tx: Prisma.TransactionClient,
    data: { name: string; slug: string },
  ) {
    return tx.tenant.create({ data });
  }

  update(
    id: string,
    data: { name?: string; status?: "active" | "suspended" },
  ) {
    return this.prisma.scoped.tenant.update({ where: { id }, data });
  }

  /** 软删除：保留数据，slug 释放（partial unique index 只约束 deletedAt IS NULL） */
  softDelete(id: string) {
    return this.prisma.scoped.tenant.update({
      where: { id },
      data: { status: "suspended", deletedAt: new Date() },
    });
  }

  countMembers(tenantId: string) {
    return this.prisma.scoped.userTenant.count({ where: { tenantId } });
  }

  /**
   * subscriptions 启用了 RLS，平台级查询也要临时设置 app.tenant_id，
   * 否则 policy 会把行过滤掉、统计恒为 0。
   */
  countSubscriptions(tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return tx.subscription.count({ where: { tenantId } });
    });
  }
}
