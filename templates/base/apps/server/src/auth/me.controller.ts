import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "@nestjs/authentication";
import { Can } from "@nestjs/authorization";
import { UsersRepository } from "./users.repository";

/** 当前登录用户自身的信息（不需要租户上下文，因此不挂 TenantMembershipGuard） */
@Controller("me")
export class MeController {
  constructor(private readonly users: UsersRepository) {}

  /** 我所属的租户列表：前端据此渲染租户切换器，或拼出默认的 /t/:tenantId URL。 */
  @Get("tenants")
  @Can.Anyone()
  tenants(@CurrentUser("id") userId: string) {
    return this.users.findTenants(userId);
  }
}
