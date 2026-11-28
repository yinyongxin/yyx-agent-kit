import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_OPTIONS = "rate-limit:options";
export const RATE_LIMIT_SKIP = "rate-limit:skip";

export type RateLimitOptions = {
  /** 窗口内最大请求数；缺省用 app.apiRateLimitMax */
  limit?: number;
  /** 窗口秒数；缺省用 app.apiRateLimitWindowSeconds */
  windowSeconds?: number;
  /** 自定义 key 后缀；缺省按 Controller.method 分组 */
  key?: string;
};

/** 覆盖单个路由的全局限流规则 */
export const RateLimit = (options: RateLimitOptions = {}) =>
  SetMetadata(RATE_LIMIT_OPTIONS, options);

/** 跳过全局限流（健康检查、开发探针等） */
export const SkipRateLimit = () => SetMetadata(RATE_LIMIT_SKIP, true);
