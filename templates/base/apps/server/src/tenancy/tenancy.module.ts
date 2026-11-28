import { Module } from "@nestjs/common";
import { TenantController } from "./tenant.controller";
import { TenancyService } from "./tenancy.service";
import { TenantTransactionInterceptor } from "./interceptors/tenant-transaction.interceptor";
import { TenantMembersController } from "./members/members.controller";
import { MembersService } from "./members/members.service";
import { MembersRepository } from "./members/members.repository";

@Module({
  controllers: [TenantController, TenantMembersController],
  providers: [
    TenancyService,
    MembersService,
    MembersRepository,
    TenantTransactionInterceptor,
  ],
  exports: [TenancyService],
})
export class TenancyModule {}

