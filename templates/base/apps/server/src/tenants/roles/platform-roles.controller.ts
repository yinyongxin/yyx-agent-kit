import { Controller, Get, Param, ParseUUIDPipe, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Can } from "@nestjs/authorization";
import { API_ROUTES, asRoute } from "../../shared";
import type { Prisma } from "../../generated/prisma/client";
import { ErrorResponseDto } from "../../dto/error-response.dto";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { TenantTx } from "../../tenancy/decorators/tenant-tx.decorator";
import { TenantTransactionInterceptor } from "../../tenancy/interceptors/tenant-transaction.interceptor";
import { RoleOptionDto } from "../../tenancy/roles/dto/role-response.dto";
import { PlatformRolesService } from "./platform-roles.service";

/**
 * 平台级租户角色选项（/tenants/:tenantId/roles/options）。
 * 平台管理员可能不是该租户成员，不能走租户成员 Guard。
 */
@ApiTags("tenants")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(TenantTransactionInterceptor)
@Controller(asRoute(`${API_ROUTES.tenants}/:tenantId${API_ROUTES.tenantRoles}`))
export class PlatformTenantRolesController {
  constructor(private readonly roles: PlatformRolesService) {}

  @ApiOperation({ summary: "平台级：租户角色选项（成员管理下拉）" })
  @ApiOkResponse({ type: [RoleOptionDto] })
  @Get(asRoute(API_ROUTES.tenantRoleOptions))
  @Can.Anyone()
  options(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
  ): Promise<RoleOptionDto[]> {
    return this.roles.options(tx, tenantId);
  }
}
