import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { TenantContext } from "../auth/tenant-context";

/** 不按租户过滤的全局表 */
const GLOBAL_MODELS = new Set(["Tenant", "Permission", "Plan"]);

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
   * tenantId 来自请求上下文（TenantMiddleware 从 JWT claim 写入）。
   * 全局表（Tenant / Permission / Plan）不注入。
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
          if (GLOBAL_MODELS.has(model)) return query(args);

          const tenantId = TenantContext.getTenantId();

          if (operation === "create" || operation === "createMany") {
            const data = (args as { data?: Record<string, unknown> | Record<string, unknown>[] }).data;
            const inject = (d: Record<string, unknown>) => ({ tenantId, ...d });
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
