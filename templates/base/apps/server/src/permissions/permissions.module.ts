import { Module } from "@nestjs/common";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard";
import { PermissionsController } from "./permissions.controller";
import { PermissionsService } from "./permissions.service";
import { PermissionsRepository } from "./repositories/permissions.repository";

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsRepository, PlatformAdminGuard],
})
export class PermissionsModule {}
