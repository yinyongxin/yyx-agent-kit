import { Module } from "@nestjs/common";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";
import { TenantsRepository } from "./repositories/tenants.repository";

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository, PlatformAdminGuard],
})
export class TenantsModule {}
