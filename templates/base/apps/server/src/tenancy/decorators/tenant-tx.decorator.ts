import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";

/**
 * 取当前请求的租户事务客户端（TenantTransactionInterceptor 已设置 app.tenant_id）。
 * 租户表查询必须用它；不要用 prisma.scoped（连接池另一条连接，RLS 下查不到）。
 */
export const TenantTx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Prisma.TransactionClient => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ tenantTx?: Prisma.TransactionClient }>();
    if (!req?.tenantTx) {
      throw new Error(
        "租户事务上下文缺失：确认 TenantTransactionInterceptor 已挂载到该路由",
      );
    }
    return req.tenantTx;
  },
);
