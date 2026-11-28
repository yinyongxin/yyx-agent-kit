import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import {
  PLATFORM_ADMIN_LEVEL,
  type PlatformAdminLevel,
} from "../decorators/platform-admin.decorator";

const LEVEL_RANK: Record<string, number> = { ops: 1, super: 2 };

/**
 * 平台管理员校验：只有 PlatformAdmin（super/ops）能访问平台级资源（如租户 CRUD）。
 * 与租户成员校验（TenantMembershipGuard）是两层：这里看「是不是平台管理员」，
 * 后者看「是不是这个租户的成员」。
 *
 * 可通过 `@RequirePlatformAdminLevel("super")` 进一步要求级别。
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException("需要先登录");

    const admin = await this.prisma.scoped.platformAdmin.findUnique({
      where: { userId },
    });
    if (!admin) throw new ForbiddenException("需要平台管理员权限");

    const required = this.reflector.getAllAndOverride<PlatformAdminLevel>(
      PLATFORM_ADMIN_LEVEL,
      [context.getHandler(), context.getClass()],
    );
    if (
      required &&
      (LEVEL_RANK[admin.level] ?? 0) < (LEVEL_RANK[required] ?? Number.MAX_SAFE_INTEGER)
    ) {
      throw new ForbiddenException(`需要 ${required} 平台管理员`);
    }
    return true;
  }
}
