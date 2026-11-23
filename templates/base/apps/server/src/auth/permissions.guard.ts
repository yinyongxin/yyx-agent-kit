import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { PERMISSIONS_KEY } from "./permissions.decorator";

/**
 * 权限守卫：从业务库查用户角色权限，不直接信 token 里的 claim —— 权限变更即时生效。
 * 前端隐藏只是体验，服务端校验才是安全边界。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { userId?: string };
    }>();
    const userId = request.user?.userId;
    if (!userId) throw new UnauthorizedException("未登录");

    const user = await this.prisma.scoped.user.findFirst({
      where: { id: userId, status: "active" },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) throw new ForbiddenException("用户不存在或已禁用");

    const codes = new Set(
      user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.code),
      ),
    );
    const missing = required.filter((code) => !codes.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(`缺少权限: ${missing.join(", ")}`);
    }
    return true;
  }
}
