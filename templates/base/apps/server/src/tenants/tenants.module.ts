import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";
import { TenantsRepository } from "./repositories/tenants.repository";
import { PlatformTenantMembersController } from "./members/platform-members.controller";
import { PlatformMembersService } from "./members/platform-members.service";
import { PlatformTenantRolesController } from "./roles/platform-roles.controller";
import { PlatformRolesService } from "./roles/platform-roles.service";

@Module({
  imports: [TenancyModule],
  controllers: [
    TenantsController,
    PlatformTenantMembersController,
    PlatformTenantRolesController,
  ],
  providers: [
    TenantsService,
    TenantsRepository,
    PlatformAdminGuard,
    PlatformMembersService,
    PlatformRolesService,
  ],
})
export class TenantsModule {}
