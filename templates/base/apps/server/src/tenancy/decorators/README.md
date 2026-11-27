# tenancy/decorators

## 职责

租户路由的参数装饰器。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenant-tx.decorator.ts` | `@TenantTx()` 取当前请求的事务客户端（由 `TenantTransactionInterceptor` 注入） |

## 注意事项

- 只能在挂了 `TenantTransactionInterceptor` 的 controller 上使用。
