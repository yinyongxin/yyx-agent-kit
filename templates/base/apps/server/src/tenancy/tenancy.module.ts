import { Module } from "@nestjs/common";
import { TenantController } from "./tenant.controller";
import { TenancyService } from "./tenancy.service";
import { TenantTransactionInterceptor } from "./interceptors/tenant-transaction.interceptor";

@Module({
  controllers: [TenantController],
  providers: [TenancyService, TenantTransactionInterceptor],
  exports: [TenancyService],
})
export class TenancyModule {}
