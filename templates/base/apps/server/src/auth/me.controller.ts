import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "@nestjs/authentication";
import { Can } from "@nestjs/authorization";
import { API_ROUTES, asRoute } from "../../../../packages/shared/src/index";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { TenantSummaryDto } from "./dto/tenant-summary.dto";
import { UsersRepository } from "./repositories/users.repository";

/** 当前登录用户自身的信息（不需要租户上下文，因此不挂 TenantMembershipGuard） */
@ApiTags("me")
@ApiBearerAuth()
@Controller(asRoute(API_ROUTES.me))
export class MeController {
  constructor(private readonly users: UsersRepository) {}

  /** 我所属的租户列表：前端据此渲染租户切换器，或拼出默认的 /t/:tenantId URL。 */
  @ApiOperation({ summary: "当前用户所属的租户列表" })
  @ApiOkResponse({ type: [TenantSummaryDto] })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get(asRoute(API_ROUTES.meTenants))
  @Can.Anyone()
  tenants(@CurrentUser("id") userId: string): Promise<TenantSummaryDto[]> {
    return this.users.findTenants(userId);
  }
}
