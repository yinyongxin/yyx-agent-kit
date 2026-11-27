import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { lastValueFrom, of, type Observable } from "rxjs";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * RLS S1：为 /t/:tenantId/... 请求开启交互式事务并设置 app.tenant_id。
 *
 * 必须用 `set_config(..., true)`（LOCAL）：Prisma 从连接池取连接，session 级 SET
 * 会让后续查询用不同连接、并把租户带到下一个请求。事务保证同一连接与自动清理。
 *
 * 事务客户端通过 request.tenantTx 暴露，业务控制器用 `@TenantTx()` 参数装饰器取。
 * 不用 AsyncLocalStorage 传 tx：Prisma 的 $transaction 回调与 Nest Interceptor 的
 * 订阅调度会脱离 ALS 上下文（实测 getTx() 在 handler 里读不到）。
 *
 * 已知限制：lastValueFrom 把 handler 压平成单个值，适用于 JSON 端点；
 * 不适用于 SSE / 多 chunk 流式响应。超时由 maxWait/timeout 兜底。
 */
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<{
      params?: { tenantId?: string };
      tenantTx?: Prisma.TransactionClient;
    }>();
    // 直接从路由参数取：middleware 的 AsyncLocalStorage 上下文不保证传播到 Interceptor
    const tenantId = req.params?.tenantId;
    if (!tenantId) return next.handle(); // health / auth / me 等非租户路由不需要事务

    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        req.tenantTx = tx;
        return lastValueFrom(next.handle());
      },
      { maxWait: 2_000, timeout: 5_000 },
    );

    return of(result);
  }
}
