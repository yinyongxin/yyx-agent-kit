import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

/**
 * 平台管理员校验：只有 PlatformAdmin（super/ops）能访问平台级资源（如租户 CRUD）。
 * 与租户成员校验（TenantMembershipGuard）是两层：这里看「是不是平台管理员」，
 * 后者看「是不是这个租户的成员」。
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException("需要先登录");

    const admin = await this.prisma.scoped.platformAdmin.findUnique({
      where: { userId },
    });
    if (!admin) throw new ForbiddenException("需要平台管理员权限");
    return true;
  }
}
