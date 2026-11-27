# tenancy/interceptors

## 职责

租户请求的事务与上下文拦截。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenant-transaction.interceptor.ts` | 为 `/t/:tenantId/...` 开交互式事务、`set_config('app.tenant_id', ..., true)`，把 tx 挂到 `req.tenantTx` |

## 注意事项

- 用 `lastValueFrom` 压平响应，仅适用于 JSON 端点，不适用于 SSE/流式。
- 事务客户端通过 `@TenantTx()` 取，不依赖 AsyncLocalStorage。
