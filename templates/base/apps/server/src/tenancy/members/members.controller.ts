import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Can } from "@nestjs/authorization";
import { CurrentUser } from "@nestjs/authentication";
import { API_ROUTES, asRoute, PERMISSIONS } from "../../shared";
import type { Prisma } from "../../generated/prisma/client";
import { Audit } from "../../audit/audit.decorator";
import { ErrorResponseDto } from "../../dto/error-response.dto";
import { CurrentMembership } from "../../auth/decorators/membership.decorator";
import { RequirePermission } from "../../auth/decorators/permission.decorator";
import type { Membership } from "../../auth/membership.types";
import { TenantMembershipGuard } from "../../auth/guards/tenant-membership.guard";
import { TenantTx } from "../decorators/tenant-tx.decorator";
import { TenantTransactionInterceptor } from "../interceptors/tenant-transaction.interceptor";
import { AddMemberDto } from "./dto/add-member.dto";
import { MemberListResponseDto, MemberResponseDto } from "./dto/member-response.dto";
import { QueryMembersDto } from "./dto/query-members.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { MembersService } from "./members.service";

/**
 * 租户成员管理（/t/:tenantId/members）。
 *
 * - 查询：租户内任意成员可见
 * - 增删改：需要 admin / owner（`@MinRole("admin")`）
 * - 所有查询走 `@TenantTx()`：Interceptor 已设置 app.tenant_id，roles 受 RLS 保护
 * - UserTenant / User 是全局表，Repository 显式带 tenantId 过滤
 */
@ApiTags("tenancy")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@UseGuards(TenantMembershipGuard)
@UseInterceptors(TenantTransactionInterceptor)
@Controller(asRoute(`${API_ROUTES.tenant}${API_ROUTES.tenantMembers}`))
export class TenantMembersController {
  constructor(private readonly members: MembersService) {}

  @ApiOperation({ summary: "租户成员列表（分页 / 成员状态 / email、displayName 搜索）" })
  @ApiOkResponse({ type: MemberListResponseDto })
  @Get()
  @RequirePermission(PERMISSIONS.userRead)
  @Can.Anyone()
  list(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Query() query: QueryMembersDto,
  ): Promise<MemberListResponseDto> {
    return this.members.list(tx, tenantId, query);
  }

  @ApiOperation({ summary: "添加成员（按邮箱，角色默认 member）" })
  @ApiCreatedResponse({ type: MemberResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Post()
  @RequirePermission(PERMISSIONS.userWrite)
  @Can.Anyone()
  @Audit({
    action: "member.create",
    resource: "member",
    resourceId: (data) => (data as MemberResponseDto | undefined)?.userId ?? null,
  })
  add(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Body() dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    return this.members.add(tx, tenantId, dto);
  }

  @ApiOperation({ summary: "更新成员（租户内状态 / 角色；不能改自己）" })
  @ApiOkResponse({ type: MemberResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @Patch(":userId")
  @RequirePermission(PERMISSIONS.userWrite)
  @Can.Anyone()
  @Audit({
    action: "member.update",
    resource: "member",
    resourceId: (_data, req) => req.params.userId ?? null,
  })
  update(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentMembership() membership: Membership,
  ): Promise<MemberResponseDto> {
    return this.members.update(tx, tenantId, userId, dto, membership.userId);
  }

  @ApiOperation({ summary: "移除成员（同时移除其在当前租户的角色；不能移除自己）" })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(":userId")
  @RequirePermission(PERMISSIONS.userWrite)
  @Can.Anyone()
  @Audit({
    action: "member.delete",
    resource: "member",
    resourceId: (_data, req) => req.params.userId ?? null,
  })
  remove(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser("id") actorUserId: string,
  ): Promise<void> {
    return this.members.remove(tx, tenantId, userId, actorUserId);
  }
}
