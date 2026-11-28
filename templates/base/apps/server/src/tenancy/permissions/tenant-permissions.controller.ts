import { Controller, Get, Param, UseGuards } from "@nestjs/common";
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
import { ErrorResponseDto } from "../../dto/error-response.dto";
import { TenantMembershipGuard } from "../../auth/guards/tenant-membership.guard";
import { PermissionDto } from "./dto/permission.dto";
import { PermissionsService } from "./permissions.service";

/**
 * 权限点目录（只读）。
 *
 * 权限点是全局定义（Permission），没有 tenantId；放在租户路由下是为了让
 * 租户管理员在分配角色权限时能读取目录，同时仍要求是当前租户成员。
 */
@ApiTags("tenancy")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@UseGuards(TenantMembershipGuard)
@Controller(asRoute(`${API_ROUTES.tenant}${API_ROUTES.tenantPermissions}`))
export class TenantPermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @ApiOperation({ summary: "权限点目录（角色分配用）" })
  @ApiOkResponse({ type: [PermissionDto] })
  @Get()
  @Can.Anyone()
  list(@Param("tenantId") _tenantId: string): Promise<PermissionDto[]> {
    return this.permissions.list();
  }
}
