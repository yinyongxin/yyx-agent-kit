import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextValue {
  /** W3C trace-id（32 位 hex），整条调用链一致 */
  traceId: string;
  /** 当前请求的 span-id（16 位 hex） */
  spanId: string;
  /** 单次请求 id（应用内唯一，用于排查） */
  requestId: string;
  /** 客户端 IP（优先 X-Forwarded-For 第一段）；审计日志用 */
  ip?: string;
  /** User-Agent；审计日志用 */
  userAgent?: string;
  /** 审计 before 快照：业务 service 在更新/删除前写入，AuditInterceptor 读取 */
  auditBefore?: unknown;
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

  /**
   * 写入审计 before 快照。
   * 在 service 的更新/删除逻辑里、拿到旧实体后调用；同一请求只保留最后一次。
   */
  setAuditBefore(value: unknown): void {
    const ctx = storage.getStore();
    if (ctx) ctx.auditBefore = value;
  },

  getAuditBefore(): unknown {
    return storage.getStore()?.auditBefore;
  },
};
