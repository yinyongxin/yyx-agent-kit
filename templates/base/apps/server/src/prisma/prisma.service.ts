import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { TenantContext } from "../auth/tenant-context.util";

/**
 * 不注入 tenantId 过滤的表。分三类：
 * 1. 全局表：自身没有 tenantId 列（Tenant / User / Permission / Plan / PlatformAdmin）
 * 2. 授权关系表：UserTenant 是 guard 查询「当前租户」的入口，不能被隐式过滤（否则鸡生蛋）
 * 3. 关联表：UserRole / RolePermission / OAuthConnection 没有 tenantId 列，靠父表间接隔离
 *
 * 注意：关联表不注入过滤，业务禁止直接裸查（如 prisma.scoped.userRole.findMany()），
 * 应从已过滤的父表走 relation（如 role.users），否则会读到其它租户的关联数据。
 */
const UNSCOPED_MODELS = new Set([
  "Tenant",
  "User",
  "UserTenant",
  "OAuthConnection",
  "Permission",
  "UserRole",
  "RolePermission",
  "PlatformAdmin",
  "Plan",
]);

/** 支持 where 注入的操作 */
const WHERE_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * 租户隔离：业务表自动注入 where.tenantId / create.data.tenantId。
   * tenantId 来自请求上下文（TenantContext，由 TenantMiddleware 从路由 /t/:tenantId 写入）。
   * UNSCOPED_MODELS 不注入（含全局表、授权关系表、无 tenantId 列的关联表），见上方注释。
   *
   * 注意：findUnique / update / delete 用唯一字段定位，Prisma 不允许在 where 加非唯一字段，
   * 这些操作请改用 findFirst / updateMany / deleteMany 走 extension，或业务代码显式带 tenantId。
   */
  readonly scoped = this.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          if (UNSCOPED_MODELS.has(model)) return query(args);

          const tenantId = TenantContext.getTenantId();

          if (operation === "create" || operation === "createMany") {
            const data = (args as { data?: Record<string, unknown> | Record<string, unknown>[] }).data;
            // 注入值必须后置：业务 data 若带 tenantId 不能覆盖请求上下文，否则可跨租户写入
            const inject = (d: Record<string, unknown>) => ({ ...d, tenantId });
            const newData = Array.isArray(data) ? data.map(inject) : inject(data ?? {});
            return query({ ...args, data: newData });
          }

          if (WHERE_OPERATIONS.has(operation)) {
            const where = (args as { where?: Record<string, unknown> }).where ?? {};
            return query({ ...args, where: { ...where, tenantId } });
          }

          return query(args);
        },
      },
    },
  });
}

