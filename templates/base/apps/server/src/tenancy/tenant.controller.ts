import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { Can } from "@nestjs/authorization";
import type { Prisma } from "../generated/prisma/client";
import { CurrentMembership, type Membership } from "../auth/membership";
import { TenantMembershipGuard } from "../auth/tenant-membership.guard";
import { TenantTransactionInterceptor } from "./tenant-transaction.interceptor";
import { TenantTx } from "./tenant-tx.decorator";

/**
 * 租户上下文示例路由。
 * 约定：所有 /t/:tenantId/... 下的业务 controller 都必须挂 TenantMembershipGuard
 * （管人）与 TenantTransactionInterceptor（开事务、设 app.tenant_id，RLS 管资源）。
 */
@UseGuards(TenantMembershipGuard)
@UseInterceptors(TenantTransactionInterceptor)
@Controller("t/:tenantId")
export class TenantController {
  /** 读当前用户在当前租户下的成员信息，也可作为前端判断角色的接口 */
  @Get("membership")
  @Can.Anyone()
  membership(@CurrentMembership() membership: Membership) {
    return membership;
  }

  /**
   * 租户表查询示例：用 `@TenantTx()` 取请求事务客户端，RLS 自动只返回当前租户的行。
   * 不要用 prisma.scoped（连接池另一条连接，没有 app.tenant_id，查不到）。
   */
  @Get("roles")
  @Can.Anyone()
  roles(@TenantTx() tx: Prisma.TransactionClient) {
    return tx.role.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
  }
}
