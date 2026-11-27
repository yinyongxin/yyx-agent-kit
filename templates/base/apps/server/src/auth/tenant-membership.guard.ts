import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { MinRole, ROLE_RANK, type Membership } from "./membership";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 校验「当前用户是否属于路由里的租户」——与 Prisma extension 的 where.tenantId 构成双层防护：
 *   - 本 guard 管人：用户属不属于这个租户
 *   - extension 管资源：查出来的数据属不属于这个租户
 *
 * 非成员返回 404（与租户不存在同响应，不泄露资源存在）；角色不足才返回 403。
 * 用法：在需要租户上下文的 controller 上加 @UseGuards(TenantMembershipGuard)。
 */
@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      params: { tenantId?: string };
      user?: { id?: string };
      membership?: Membership;
    }>();

    // guard 在 pipe 之前运行，必须自己校验 id 格式；非法 id 直接 404，不打数据库
    const tenantId = req.params?.tenantId;
    if (!tenantId || !UUID_RE.test(tenantId)) {
      throw new NotFoundException("Tenant not found");
    }

    // 官方认证包的全局 guard 已先运行；这里再兜一层，避免漏挂认证时静默放行
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException("需要先登录");
    }

    // UserTenant 是授权关系表（UNSCOPED），这里显式按 userId + tenantId 查，不做隐式过滤
    const userTenant = await this.prisma.scoped.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!userTenant || userTenant.status !== "active") {
      throw new NotFoundException("Tenant not found");
    }

    // UserRole 也是 UNSCOPED，必须显式带 role.tenantId，否则会混进用户在其它租户的角色
    const userRoles = await this.prisma.scoped.userRole.findMany({
      where: { userId, role: { tenantId } },
      select: { role: { select: { code: true } } },
    });
    const codes = userRoles.map((item) => item.role.code);
    const role = codes.includes("owner") ? "owner" : codes.includes("admin") ? "admin" : "member";

    const required =
      this.reflector.getAllAndOverride<string>(MinRole, [
        context.getHandler(),
        context.getClass(),
      ]) ?? "member";
    if ((ROLE_RANK[role] ?? 0) < (ROLE_RANK[required] ?? Number.MAX_SAFE_INTEGER)) {
      throw new ForbiddenException(`需要 ${required} 角色`);
    }

    req.membership = { tenantId, userId, role, status: userTenant.status };
    return true;
  }
}
