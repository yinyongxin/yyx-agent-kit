import { Controller, Get, UseGuards } from "@nestjs/common";
import { Can } from "@nestjs/authorization";
import { CurrentMembership, type Membership } from "../auth/membership";
import { TenantMembershipGuard } from "../auth/tenant-membership.guard";

/**
 * 租户上下文示例路由。
 * 约定：所有 /t/:tenantId/... 下的业务 controller 都必须挂 TenantMembershipGuard，
 * 这样「用户属不属于该租户」才会被校验（Prisma extension 只管「资源属不属于该租户」）。
 */
@UseGuards(TenantMembershipGuard)
@Controller("t/:tenantId")
export class TenantController {
  /** 读当前用户在当前租户下的成员信息，也可作为前端判断角色的接口 */
  @Get("membership")
  @Can.Anyone()
  membership(@CurrentMembership() membership: Membership) {
    return membership;
  }
}
