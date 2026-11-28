import { RequestContext } from "@/logging/request-context";

/**
 * 审计上下文门面。
 *
 * 业务 service 只依赖本模块，不直接引用 logging/RequestContext；
 * 底层仍复用请求级 ALS，保证 before 只在当前请求内有效。
 */
export const AuditContext = {
  /** 在更新/删除前写入旧值快照（同一请求只保留最后一次） */
  setBefore(value: unknown): void {
    RequestContext.setAuditBefore(value);
  },

  getBefore(): unknown {
    return RequestContext.getAuditBefore();
  },
};
