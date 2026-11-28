import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextValue {
  /** W3C trace-id（32 位 hex），整条调用链一致 */
  traceId: string;
  /** 当前请求的 span-id（16 位 hex） */
  spanId: string;
  /** 单次请求 id（应用内唯一，用于排查） */
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextValue>();

/**
 * 请求级上下文（traceId / spanId / requestId）。
 *
 * 与 TenantContext 分开：租户上下文只在 /t/:tenantId 路由写入；
 * trace 上下文对每个请求都有，日志、异常过滤器、下游调用都用它。
 */
export const RequestContext = {
  run<T>(value: RequestContextValue, fn: () => T): T {
    return storage.run(value, fn);
  },

  get(): RequestContextValue | undefined {
    return storage.getStore();
  },

  getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
  },

  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
