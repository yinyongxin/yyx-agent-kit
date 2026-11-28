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
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { QueryTenantsDto } from "./dto/query-tenants.dto";
import { TenantListResponseDto } from "./dto/tenant-list-response.dto";
import { TenantResponseDto } from "./dto/tenant-response.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantsService } from "./tenants.service";

/**
 * 平台级租户资源（/api/tenants），不是租户内业务（/api/t/:tenantId/...）。
 * 只有 PlatformAdmin 能访问；授权 guard 仍要求显式 @Can.Anyone() 才放行，
 * 真正的平台管理员校验由 PlatformAdminGuard 完成。
 */
@ApiTags("tenants")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@UseGuards(PlatformAdminGuard)
@Controller(asRoute(API_ROUTES.tenants))
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @ApiOperation({ summary: "租户列表（平台管理员）" })
  @ApiOkResponse({ type: TenantListResponseDto })
  @Get()
  @Can.Anyone()
  list(@Query() query: QueryTenantsDto): Promise<TenantListResponseDto> {
    return this.tenants.list(query);
  }

  @ApiOperation({ summary: "租户详情" })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(":id")
  @Can.Anyone()
  get(@Param("id", ParseUUIDPipe) id: string): Promise<TenantResponseDto> {
    return this.tenants.get(id);
  }

  @ApiOperation({ summary: "创建租户" })
  @ApiCreatedResponse({ type: TenantResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Post()
  @Can.Anyone()
  @Audit({ action: "tenant.create", resource: "tenant" })
  create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenants.create(dto);
  }

  @ApiOperation({ summary: "更新租户（name/status，slug 不可改）" })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Patch(":id")
  @Can.Anyone()
  @Audit({ action: "tenant.update", resource: "tenant" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenants.update(id, dto);
  }

  @ApiOperation({ summary: "删除空租户（有成员/订阅返回 409）" })
  @ApiNoContentResponse()
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(":id")
  @Can.Anyone()
  @Audit({ action: "tenant.delete", resource: "tenant" })
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.tenants.remove(id);
  }
}
