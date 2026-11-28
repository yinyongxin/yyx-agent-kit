import { Controller, Get, Param, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Can } from "@nestjs/authorization";
import { API_ROUTES, asRoute } from "../shared";
import { CurrentMembership } from "../auth/decorators/membership.decorator";
import type { Membership } from "../auth/membership.types";
import { TenantMembershipGuard } from "../auth/guards/tenant-membership.guard";
import { MembershipDto } from "../auth/dto/membership.dto";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { TenantTransactionInterceptor } from "./interceptors/tenant-transaction.interceptor";

/**
 * 租户上下文示例路由。
 * 约定：所有 /t/:tenantId/... 下的业务 controller 都必须挂 TenantMembershipGuard
 * （管人）与 TenantTransactionInterceptor（开事务、设 app.tenant_id，RLS 管资源）。
 */
@ApiTags("tenancy")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@UseGuards(TenantMembershipGuard)
@UseInterceptors(TenantTransactionInterceptor)
@Controller(asRoute(API_ROUTES.tenant))
export class TenantController {
  /** 读当前用户在当前租户下的成员信息，也可作为前端判断角色的接口 */
  @ApiOperation({ summary: "当前用户在该租户下的成员信息" })
  @ApiOkResponse({ type: MembershipDto })
  @Get(asRoute(API_ROUTES.tenantMembership))
  @Can.Anyone()
  membership(
    @CurrentMembership() membership: Membership,
    @Param("tenantId") _tenantId: string,
  ): MembershipDto {
    return membership;
  }
}
