import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContextValue {
  tenantId: string;
  userId: string;
  authSubject: string;
}

const storage = new AsyncLocalStorage<TenantContextValue>();

/** 当前请求的租户上下文。由 TenantMiddleware 在入口写入，全链路可读。 */
export const TenantContext = {
  run<T>(value: TenantContextValue, fn: () => T): T {
    return storage.run(value, fn);
  },

  get(): TenantContextValue | undefined {
    return storage.getStore();
  },

  getTenantId(): string {
    const ctx = storage.getStore();
    if (!ctx) {
      throw new Error("租户上下文缺失：请求未经过 TenantMiddleware");
    }
    return ctx.tenantId;
  },
};
