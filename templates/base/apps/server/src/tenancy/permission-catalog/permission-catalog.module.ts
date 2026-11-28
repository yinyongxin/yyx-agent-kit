import { Module } from "@nestjs/common";
import { TenancyCoreModule } from "../tenancy-core.module";
import { TenantPermissionCatalogController } from "./permission-catalog.controller";
import { TenantPermissionCatalogService } from "./permission-catalog.service";
import { TenantPermissionCatalogRepository } from "./repositories/permission-catalog.repository";

/** 租户内权限点目录（只读，`/t/:tenantId/permissions`） */
@Module({
  imports: [TenancyCoreModule],
  controllers: [TenantPermissionCatalogController],
  providers: [TenantPermissionCatalogService, TenantPermissionCatalogRepository],
})
export class TenancyPermissionCatalogModule {}
