# tenants/repositories

## 职责

租户数据访问。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenants.repository.ts` | 列表/详情/按 slug 查/创建/更新/删除，删除前的成员与订阅计数 |

## 注意事项

- `Tenant` 是全局表（UNSCOPED），用 `prisma.scoped`；不要加租户前缀过滤。
- `subscriptions` 启用 RLS，统计订阅前必须在事务内 `set_config('app.tenant_id', ..., true)`。
- 平台级查询没有租户上下文，不能直接查租户表（会返回 0 行）。
