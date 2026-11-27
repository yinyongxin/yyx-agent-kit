import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
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
import { ErrorResponseDto } from "../dto/error-response.dto";
import type { Prisma } from "../generated/prisma/client";
import { CurrentMembership, type Membership } from "../auth/membership";
import { TenantMembershipGuard } from "../auth/tenant-membership.guard";
import { MembershipDto } from "../auth/dto/membership.dto";
import { RoleDto } from "./dto/role.dto";
import { TenantTransactionInterceptor } from "./tenant-transaction.interceptor";
import { TenantTx } from "./tenant-tx.decorator";

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
@Controller("t/:tenantId")
export class TenantController {
  /** 读当前用户在当前租户下的成员信息，也可作为前端判断角色的接口 */
  @ApiOperation({ summary: "当前用户在该租户下的成员信息" })
  @ApiOkResponse({ type: MembershipDto })
  @Get("membership")
  @Can.Anyone()
  membership(
    @CurrentMembership() membership: Membership,
    @Param("tenantId") _tenantId: string,
  ) {
    return membership;
  }

  /**
   * 租户表查询示例：用 `@TenantTx()` 取请求事务客户端，RLS 自动只返回当前租户的行。
   * 不要用 prisma.scoped（连接池另一条连接，没有 app.tenant_id，查不到）。
   */
  @ApiOperation({ summary: "当前租户的角色列表（租户表查询示例）" })
  @ApiOkResponse({ type: [RoleDto] })
  @Get("roles")
  @Can.Anyone()
  roles(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") _tenantId: string,
  ) {
    return tx.role.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
  }
}
