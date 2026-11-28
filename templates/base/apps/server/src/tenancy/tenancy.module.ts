import { Module } from "@nestjs/common";
import { TenancyCoreModule } from "./tenancy-core.module";
import { TenantController } from "./tenant.controller";
import { TenancyMembersModule } from "./members/members.module";
import { TenancyRolesModule } from "./roles/roles.module";
import { TenancyPermissionCatalogModule } from "./permission-catalog/permission-catalog.module";

/**
 * 租户上下文命名空间模块。
 *
 * 本身只保留 `/t/:tenantId` 基础路由；成员 / 角色 / 权限目录各自是真正的
 * Nest 子模块，由本模块统一 imports 与 exports，平台模块可复用其中的 Service。
 */
@Module({
  imports: [
    TenancyCoreModule,
    TenancyMembersModule,
    TenancyRolesModule,
    TenancyPermissionCatalogModule,
  ],
  controllers: [TenantController],
  exports: [TenancyCoreModule, TenancyMembersModule, TenancyRolesModule],
})
export class TenancyModule {}
