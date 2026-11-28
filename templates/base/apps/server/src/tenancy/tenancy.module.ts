import { Module } from "@nestjs/common";
import { TenantController } from "./tenant.controller";
import { TenantTransactionInterceptor } from "./interceptors/tenant-transaction.interceptor";
import { TenantMembersController } from "./members/members.controller";
import { MembersService } from "./members/members.service";
import { MembersRepository } from "./members/members.repository";
import { RolesController } from "./roles/roles.controller";
import { RolesService } from "./roles/roles.service";
import { RolesRepository } from "./roles/roles.repository";
import { PermissionsController } from "./permissions/permissions.controller";
import { PermissionsService } from "./permissions/permissions.service";
import { PermissionsRepository } from "./permissions/permissions.repository";

@Module({
  controllers: [
    TenantController,
    TenantMembersController,
    RolesController,
    PermissionsController,
  ],
  providers: [
    MembersService,
    MembersRepository,
    RolesService,
    RolesRepository,
    PermissionsService,
    PermissionsRepository,
    TenantTransactionInterceptor,
  ],
})
export class TenancyModule {}
