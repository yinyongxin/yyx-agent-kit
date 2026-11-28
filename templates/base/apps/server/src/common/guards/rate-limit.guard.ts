import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import { RedisService } from "../../redis/redis.service";
import {
  RATE_LIMIT_OPTIONS,
  RATE_LIMIT_SKIP,
  type RateLimitOptions,
} from "../decorators/rate-limit.decorator";

type RequestLike = {
  ip?: string;
  socket?: { remoteAddress?: string };
};

type ResponseLike = {
  setHeader?: (name: string, value: string) => void;
};

/**
 * 全站 API 限流（固定窗口）。
 *
 * - 维度：客户端 IP + Controller.method（或 `@RateLimit({ key })`）
 * - 默认值来自 `app.apiRateLimitMax` / `app.apiRateLimitWindowSeconds`
 * - `@SkipRateLimit()` 可跳过（健康检查等）
 * - Redis 不可用时 fail-open
 * - 代理场景需要 `TRUST_PROXY` 让 `req.ip` 取真实客户端 IP
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const override =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_OPTIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {};
    const limit = override.limit ?? this.config.getOrThrow<number>("app.apiRateLimitMax");
    const windowSeconds =
      override.windowSeconds ??
      this.config.getOrThrow<number>("app.apiRateLimitWindowSeconds");

    const request = context.switchToHttp().getRequest<RequestLike>();
    const response = context.switchToHttp().getResponse<ResponseLike>();
    const ip = request.ip ?? request.socket?.remoteAddress ?? "unknown";
    const route =
      override.key ??
      `${context.getClass().name}.${context.getHandler().name}`;
    const key = `rate:api:${this.hash(ip)}:${route}`;

    const count = await this.redis.incr(key);
    if (count === null) return true; // Redis 不可用：放行

    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    response.setHeader?.("X-RateLimit-Limit", String(limit));
    response.setHeader?.("X-RateLimit-Remaining", String(remaining));
    response.setHeader?.(
      "X-RateLimit-Reset",
      String(Math.floor(Date.now() / 1000) + windowSeconds),
    );

    if (count > limit) {
      response.setHeader?.("Retry-After", String(windowSeconds));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "请求过于频繁，请稍后再试",
          error: "Too Many Requests",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
  }
}
