import { Module } from "@nestjs/common";
import { TenantTransactionInterceptor } from "./interceptors/tenant-transaction.interceptor";

/**
 * 租户上下文公共设施：事务拦截器。
 *
 * 所有 `/t/:tenantId/...` 子模块导入本模块，避免各自重复 provide，
 * 也避免遗漏 `app.tenant_id` 事务设置。
 */
@Module({
  providers: [TenantTransactionInterceptor],
  exports: [TenantTransactionInterceptor],
})
export class TenancyCoreModule {}
