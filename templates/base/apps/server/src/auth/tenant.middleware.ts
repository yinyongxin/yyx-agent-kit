import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { TenantContext } from "./tenant-context.util";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 从路由 /t/:tenantId/... 解析当前租户并写入请求上下文，供 Prisma 自动过滤使用。
 *
 * 两个关键设计：
 * 1. 租户来自 URL 而非 JWT claim —— 一个用户可属于多个租户，切换租户不需要重签 token。
 * 2. 在 middleware 里用 TenantContext.run(ctx, next) 包裹后续链 —— AsyncLocalStorage
 *    的上下文只在 run 的异步链内有效；guard 里调用 run 无法传播到 Nest 后续的 controller。
 *
 * 本 middleware 不做成员校验（那是 TenantMembershipGuard 的职责），非法 id 交给 guard 返回 404。
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = this.resolveTenantId(req);
    if (!tenantId) return next(); // health / auth / me 等非租户路由不带上下文

    TenantContext.run({ tenantId }, next);
  }

  /** 优先取 Express 路由参数，兼容全局前缀场景再从 path 正则提取 */
  private resolveTenantId(req: Request): string | null {
    // Express 5 的 params 值类型为 string | string[]，统一取第一个
    const raw = req.params?.tenantId;
    const fromParams = Array.isArray(raw) ? raw[0] : raw;
    const candidate = fromParams ?? req.path.match(/\/t\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] ?? null;
    return candidate && UUID_RE.test(candidate) ? candidate : null;
  }
}
