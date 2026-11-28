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
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { API_ROUTES, asRoute } from "../../shared";
import type { Prisma } from "../../generated/prisma/client";
import { Audit } from "../../audit/audit.decorator";
import { ErrorResponseDto } from "../../dto/error-response.dto";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { RequirePlatformAdminLevel } from "../../auth/decorators/platform-admin.decorator";
import { TenantTx } from "../../tenancy/decorators/tenant-tx.decorator";
import { TenantTransactionInterceptor } from "../../tenancy/interceptors/tenant-transaction.interceptor";
import { AddMemberDto } from "../../tenancy/members/dto/add-member.dto";
import {
  MemberListResponseDto,
  MemberResponseDto,
} from "../../tenancy/members/dto/member-response.dto";
import { QueryMembersDto } from "../../tenancy/members/dto/query-members.dto";
import { UpdateMemberDto } from "../../tenancy/members/dto/update-member.dto";
import { PlatformMembersService } from "./platform-members.service";

/**
 * 平台级租户成员管理（/tenants/:tenantId/members）。
 *
 * 用于新租户引导、空租户补人、租户管理员丢失后的恢复，不要求操作者是租户成员。
 * - 读：任意平台管理员
 * - 写：仅 super（ops 只读），并禁止移除/停用最后一个管理员
 */
@ApiTags("tenants")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(TenantTransactionInterceptor)
@Controller(asRoute(`${API_ROUTES.tenants}/:tenantId${API_ROUTES.tenantMembers}`))
export class PlatformTenantMembersController {
  constructor(private readonly members: PlatformMembersService) {}

  @ApiOperation({ summary: "平台级：租户成员列表" })
  @ApiOkResponse({ type: MemberListResponseDto })
  @Get()
  @Can.Anyone()
  list(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Query() query: QueryMembersDto,
  ): Promise<MemberListResponseDto> {
    return this.members.list(tx, tenantId, query);
  }

  @ApiOperation({ summary: "平台级：添加成员（超级管理员）" })
  @ApiCreatedResponse({ type: MemberResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Post()
  @RequirePlatformAdminLevel("super")
  @Can.Anyone()
  @Audit({
    action: "platform.member.create",
    resource: "member",
    resourceId: (data) => (data as MemberResponseDto | undefined)?.userId ?? null,
  })
  add(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Body() dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    return this.members.add(tx, tenantId, dto);
  }

  @ApiOperation({ summary: "平台级：更新成员角色/状态（超级管理员）" })
  @ApiOkResponse({ type: MemberResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Patch(":userId")
  @RequirePlatformAdminLevel("super")
  @Can.Anyone()
  @Audit({
    action: "platform.member.update",
    resource: "member",
    resourceId: (_data, req) => req.params.userId ?? null,
  })
  update(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    return this.members.update(tx, tenantId, userId, dto);
  }

  @ApiOperation({ summary: "平台级：移除成员（超级管理员，不能移除最后一个管理员）" })
  @ApiNoContentResponse()
  @ApiConflictResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(":userId")
  @RequirePlatformAdminLevel("super")
  @Can.Anyone()
  @Audit({
    action: "platform.member.delete",
    resource: "member",
    resourceId: (_data, req) => req.params.userId ?? null,
  })
  remove(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.members.remove(tx, tenantId, userId);
  }
}
