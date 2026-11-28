import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppConfigModule } from "@/config/config.module";
import { AuditController } from "./audit.controller";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditQueryService } from "./audit-query.service";
import { AuditRepository } from "./audit.repository";
import { AuditService } from "./audit.service";

/**
 * 审计日志（append-only）。
 *
 * - `@Global`：业务模块（auth / tenants）直接注入 `AuditService`，不用逐个 import
 * - 全局拦截器只处理带 `@Audit()` 的 handler
 * - 写入与查询走同一张 PostgreSQL 表；请求日志仍在 Loki
 */
@Global()
@Module({
  imports: [AppConfigModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditQueryService,
    AuditRepository,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
