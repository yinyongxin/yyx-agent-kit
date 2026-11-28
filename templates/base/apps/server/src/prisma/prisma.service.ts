import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { truncateForLog } from "../logging/sanitize";
import { PrismaClient } from "../generated/prisma/client";

/**
 * 全局表：自身没有 tenantId 列，scoped 允许直接查询。
 * UserTenant 是授权关系表——guard 查「当前租户」的入口，不能被 RLS/extension 隐式过滤（鸡生蛋）。
 */
const GLOBAL_MODELS = new Set([
  "Tenant",
  "User",
  "UserTenant",
  "Permission",
  "PlatformAdmin",
  "Plan",
]);

/**
 * 无 tenantId 列的关联表：RLS 不保护直接对子表的查询，
 * 直接 findMany 会跨租户泄露。必须从已过滤的父表走 relation。
 */
const RELATION_MODELS = new Set([
  "UserRole",
  "RolePermission",
  "OAuthConnection",
]);

/**
 * 带 tenantId 的业务表（Role / Subscription 及后续业务表）**不属于**以上两类：
 * 必须通过 `@TenantTx()` 事务客户端访问，由数据库层 RLS 过滤。
 */

/** raw SQL 完全绕过模型层拦截，必须禁用（用 includes 兼容各版本命名） */
const isRawOperation = (operation: string) =>
  operation.toLowerCase().includes("raw");

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  /** 慢查询阈值与参数开关；constructor 里从 ConfigService 填充 */
  private readonly slowSql = { ms: 0, logParams: false };

  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>("database.url"),
      }),
    });
    this.slowSql.ms = config.getOrThrow<number>("logging.slowSqlMs");
    this.slowSql.logParams = config.getOrThrow<boolean>("logging.slowSqlParams");
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private reportSlowQuery(
    duration: number,
    model: string | undefined,
    operation: string,
    args: Record<string, unknown>,
  ): void {
    if (this.slowSql.ms <= 0 || duration < this.slowSql.ms) return;

    this.logger.warn({
      msg: "slow query",
      duration: Math.round(duration),
      model: model ?? "raw",
      operation,
      // 参数可能含业务数据 / 敏感字段：默认不记录，需要排查时再开
      ...(this.slowSql.logParams ? { args: truncateForLog(args, 1000) } : {}),
    });
  }

  /**
   * 全局表 / 授权关系表 / 关联表的查询入口。
   *
   * 为什么租户表不能走这里：scoped 从 PrismaClient 派生，查询走连接池里的**另一条连接**，
   * 没有事务级 app.tenant_id；RLS ENABLE+FORCE 后租户表会被过滤成 0 行。
   * 因此对租户表 fail-closed，强制在控制器用 `@TenantTx()` 取事务客户端查询。
   *
   * 慢查询计时也在这里：Prisma 7 + driver adapter 下 `$on("query")` 不可用
   * （运行时抛 `_engineConfig` undefined），改用 extension 包住 query 调用。
   */
  readonly scoped = this.$extends({
    query: {
      $allOperations: async ({ model, operation, args, query }: {
        model?: string;
        operation: string;
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => {
        const started = performance.now();
        try {
          // raw query 没有 model；client 级操作（$connect / $transaction 等）也没有，直接透传
          if (model === undefined) {
            if (isRawOperation(operation)) {
              throw new Error(
                "scoped client 禁止 raw SQL：会绕过租户隔离。请改用 Prisma API，或用裸 PrismaClient 查全局表",
              );
            }
            return await query(args);
          }

          if (GLOBAL_MODELS.has(model)) return await query(args);

          if (RELATION_MODELS.has(model)) {
            throw new Error(
              `关联表 ${model} 禁止直接查询：请从已过滤的父表走 relation，避免跨租户泄露`,
            );
          }

          throw new Error(
            `租户表 ${model} 必须通过 @TenantTx() 事务客户端查询（事务内设置 app.tenant_id，由 RLS 过滤）；` +
              "scoped 只用于全局表",
          );
        } finally {
          this.reportSlowQuery(performance.now() - started, model, operation, args);
        }
      },
    },
  });
}
