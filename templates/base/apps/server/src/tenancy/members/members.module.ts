import { Module } from "@nestjs/common";
import { TenancyCoreModule } from "../tenancy-core.module";
import { TenantMembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { MembersRepository } from "./repositories/members.repository";

/** 租户成员管理（`/t/:tenantId/members`） */
@Module({
  imports: [TenancyCoreModule],
  controllers: [TenantMembersController],
  providers: [MembersService, MembersRepository],
  exports: [MembersService],
})
export class TenancyMembersModule {}
