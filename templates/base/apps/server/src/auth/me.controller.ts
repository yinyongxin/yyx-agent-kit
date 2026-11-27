import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "@nestjs/authentication";
import { Can } from "@nestjs/authorization";
import { PrismaService } from "../prisma/prisma.service";

/** 当前登录用户自身的信息（不需要租户上下文，因此不挂 TenantMembershipGuard） */
@Controller("me")
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 我所属的租户列表：前端据此渲染租户切换器，或拼出默认的 /t/:tenantId URL。
   * UserTenant 是授权关系表（UNSCOPED），这里显式按 userId + active 过滤，不依赖请求上下文。
   */
  @Get("tenants")
  @Can.Anyone()
  async tenants(@CurrentUser("id") userId: string) {
    const rows = await this.prisma.scoped.userTenant.findMany({
      where: { userId, status: "active", tenant: { status: "active" } },
      select: {
        joinedAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return rows.map((row) => ({
      id: row.tenant.id,
      name: row.tenant.name,
      slug: row.tenant.slug,
      joinedAt: row.joinedAt,
    }));
  }
}
