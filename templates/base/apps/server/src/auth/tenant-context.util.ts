import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 当前请求的租户上下文。
 *
 * 写入点唯一：TenantMiddleware 从路由 /t/:tenantId 解析后调用 run() 包裹整条请求链。
 * 不在 JWT 里固化 tenantId——一个用户可属于多个租户，当前租户由 URL 决定。
 *
 * 用户身份（userId / authSubject）不作为权威来源保留在这里：
 * 业务取用户身份请用 @CurrentUser()，取成员信息请用 @CurrentMembership()。
 */
export interface TenantContextValue {
  tenantId: string;
}

const storage = new AsyncLocalStorage<TenantContextValue>();

export const TenantContext = {
  run<T>(value: TenantContextValue, fn: () => T): T {
    return storage.run(value, fn);
  },

  get(): TenantContextValue | undefined {
    return storage.getStore();
  },

  /** Prisma extension 用；无上下文时直接抛错（fail-closed，避免漏过滤变成全表查询） */
  getTenantId(): string {
    const ctx = storage.getStore();
    if (!ctx) {
      throw new Error("租户上下文缺失：请求路径必须带 /t/:tenantId 且经过 TenantMiddleware");
    }
    return ctx.tenantId;
  },
};
