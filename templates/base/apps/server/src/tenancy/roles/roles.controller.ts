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
import { MinRole } from "../../auth/decorators/membership.decorator";
import { TenantMembershipGuard } from "../../auth/guards/tenant-membership.guard";
import { TenantTx } from "../decorators/tenant-tx.decorator";
import { TenantTransactionInterceptor } from "../interceptors/tenant-transaction.interceptor";
import { CreateRoleDto } from "./dto/create-role.dto";
import { QueryRolesDto } from "./dto/query-roles.dto";
import {
  RoleListResponseDto,
  RoleOptionDto,
  RoleResponseDto,
} from "./dto/role-response.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";

/**
 * 租户角色管理（/t/:tenantId/roles）。
 *
 * - 查询：租户内任意成员可见
 * - 写：admin / owner；内置角色只读
 * - Role 受 RLS 保护，全部查询走 `@TenantTx()`
 */
@ApiTags("tenancy")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@UseGuards(TenantMembershipGuard)
@UseInterceptors(TenantTransactionInterceptor)
@Controller(asRoute(`${API_ROUTES.tenant}${API_ROUTES.tenantRoles}`))
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @ApiOperation({ summary: "角色列表（分页 / 内置或自定义 / name、code 搜索）" })
  @ApiOkResponse({ type: RoleListResponseDto })
  @Get()
  @Can.Anyone()
  list(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Query() query: QueryRolesDto,
  ): Promise<RoleListResponseDto> {
    return this.roles.list(tx, tenantId, query);
  }

  /** 成员页角色下拉用；必须声明在 `:roleId` 之前 */
  @ApiOperation({ summary: "角色选项（不分页，成员角色下拉用）" })
  @ApiOkResponse({ type: [RoleOptionDto] })
  @Get(asRoute(API_ROUTES.tenantRoleOptions))
  @Can.Anyone()
  options(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
  ): Promise<RoleOptionDto[]> {
    return this.roles.options(tx, tenantId);
  }

  @ApiOperation({ summary: "角色详情（含权限点 code）" })
  @ApiOkResponse({ type: RoleResponseDto })
  @Get(":roleId")
  @Can.Anyone()
  get(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Param("roleId", ParseUUIDPipe) roleId: string,
  ): Promise<RoleResponseDto> {
    return this.roles.get(tx, tenantId, roleId);
  }

  @ApiOperation({ summary: "创建自定义角色（可选权限点）" })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Post()
  @MinRole("admin")
  @Can.Anyone()
  @Audit({
    action: "role.create",
    resource: "role",
    resourceId: (data) => (data as RoleResponseDto | undefined)?.id ?? null,
  })
  create(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roles.create(tx, tenantId, dto);
  }

  @ApiOperation({ summary: "更新角色（name / description / 权限点；内置角色只读）" })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch(":roleId")
  @MinRole("admin")
  @Can.Anyone()
  @Audit({
    action: "role.update",
    resource: "role",
    resourceId: (_data, req) => req.params.roleId ?? null,
  })
  update(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roles.update(tx, tenantId, roleId, dto);
  }

  @ApiOperation({ summary: "删除自定义角色（有成员使用或内置角色返回 409/403）" })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(":roleId")
  @MinRole("admin")
  @Can.Anyone()
  @Audit({
    action: "role.delete",
    resource: "role",
    resourceId: (_data, req) => req.params.roleId ?? null,
  })
  remove(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") tenantId: string,
    @Param("roleId", ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    return this.roles.remove(tx, tenantId, roleId);
  }
}
