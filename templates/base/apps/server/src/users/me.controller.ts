import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "@nestjs/authentication";
import { Can } from "@nestjs/authorization";
import { API_ROUTES, asRoute } from "../shared";
import { Audit } from "../audit/audit.decorator";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { MeResponseDto } from "./dto/me-response.dto";
import { TenantSummaryDto } from "./dto/tenant-summary.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { MeService } from "./me.service";

/** 当前登录用户自身的信息（不需要租户上下文，因此不挂 TenantMembershipGuard） */
@ApiTags("me")
@ApiBearerAuth()
@Controller(asRoute(API_ROUTES.me))
export class MeController {
  constructor(private readonly me: MeService) {}

  /** 当前用户资料 + 是否平台管理员；前端据此做平台级页面门禁 */
  @ApiOperation({ summary: "当前用户资料（含平台管理员标记）" })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get()
  @Can.Anyone()
  get(@CurrentUser("id") userId: string): Promise<MeResponseDto> {
    return this.me.getProfile(userId);
  }

  /** 只能改显示名；邮箱 / 状态 / 角色由平台用户管理负责 */
  @ApiOperation({ summary: "更新当前用户资料（displayName）" })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Patch()
  @Can.Anyone()
  @Audit({ action: "user.profile.update", resource: "user" })
  update(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<MeResponseDto> {
    return this.me.updateProfile(userId, dto);
  }

  @ApiOperation({ summary: "修改当前用户密码（需旧密码）" })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Post(asRoute(API_ROUTES.mePassword))
  @Can.Anyone()
  @Audit({
    action: "user.password.change",
    resource: "user",
    recordResult: false,
    resourceId: (_data, req) => req.user?.id ?? null,
  })
  changePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.me.changePassword(userId, dto);
  }

  /** 我所属的租户列表：前端据此渲染租户切换器，或拼出默认的 /t/:tenantId URL */
  @ApiOperation({ summary: "当前用户所属的租户列表" })
  @ApiOkResponse({ type: [TenantSummaryDto] })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get(asRoute(API_ROUTES.meTenants))
  @Can.Anyone()
  tenants(@CurrentUser("id") userId: string): Promise<TenantSummaryDto[]> {
    return this.me.tenants(userId);
  }
}
