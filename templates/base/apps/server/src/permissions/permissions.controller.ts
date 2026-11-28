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
import { API_ROUTES, asRoute } from "../shared";
import { Audit } from "../audit/audit.decorator";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import {
  PermissionListResponseDto,
  PermissionResponseDto,
} from "./dto/permission-response.dto";
import { QueryPermissionsDto } from "./dto/query-permissions.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { PermissionsService } from "./permissions.service";

/**
 * 平台级权限点管理（/permissions），只给平台管理员。
 *
 * 权限点是全局定义，不属于某个租户；租户只能通过角色引用它。
 * code 创建后不可改，删除前检查是否仍被角色引用。
 */
@ApiTags("permissions")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@UseGuards(PlatformAdminGuard)
@Controller(asRoute(API_ROUTES.permissions))
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @ApiOperation({ summary: "权限点列表（分页 / name、code 搜索）" })
  @ApiOkResponse({ type: PermissionListResponseDto })
  @Get()
  @Can.Anyone()
  list(@Query() query: QueryPermissionsDto): Promise<PermissionListResponseDto> {
    return this.permissions.list(query);
  }

  @ApiOperation({ summary: "权限点详情" })
  @ApiOkResponse({ type: PermissionResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(":id")
  @Can.Anyone()
  get(@Param("id", ParseUUIDPipe) id: string): Promise<PermissionResponseDto> {
    return this.permissions.get(id);
  }

  @ApiOperation({ summary: "创建权限点（code 形如 resource:action）" })
  @ApiCreatedResponse({ type: PermissionResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Post()
  @Can.Anyone()
  @Audit({ action: "permission.create", resource: "permission" })
  create(@Body() dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    return this.permissions.create(dto);
  }

  @ApiOperation({ summary: "更新权限点（name / description，code 不可改）" })
  @ApiOkResponse({ type: PermissionResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Patch(":id")
  @Can.Anyone()
  @Audit({ action: "permission.update", resource: "permission" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissions.update(id, dto);
  }

  @ApiOperation({ summary: "删除权限点（仍被角色引用返回 409）" })
  @ApiNoContentResponse()
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(":id")
  @Can.Anyone()
  @Audit({ action: "permission.delete", resource: "permission" })
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.permissions.remove(id);
  }
}
