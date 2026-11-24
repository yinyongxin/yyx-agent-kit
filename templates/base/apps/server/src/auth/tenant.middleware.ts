import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { TenantContext } from "./tenant-context.util";

/**
 * 从 Authorization Bearer token 解析租户上下文（不做签名校验，由 JwtStrategy 负责）。
 * 让 PrismaService 的租户过滤在 Controller/Guard 之前就能拿到 tenantId。
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
        ) as { sub?: string; tenantId?: string; userId?: string };
        if (payload.tenantId && payload.userId) {
          TenantContext.run(
            {
              tenantId: payload.tenantId,
              userId: payload.userId,
              authSubject: payload.sub ?? "",
            },
            next,
          );
          return;
        }
      } catch {
        // 解析失败按未带上下文处理，JwtStrategy 会在守卫阶段拒绝
      }
    }
    next();
  }
}

