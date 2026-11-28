import { Module } from "@nestjs/common";
import { TenancyCoreModule } from "../tenancy-core.module";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { RolesRepository } from "./repositories/roles.repository";

/** 租户角色管理（`/t/:tenantId/roles`） */
@Module({
  imports: [TenancyCoreModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService],
})
export class TenancyRolesModule {}
