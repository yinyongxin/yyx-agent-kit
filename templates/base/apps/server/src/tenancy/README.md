# tenancy — 租户上下文路由

## 职责

提供 `/t/:tenantId/...` 的示例 controller，演示租户隔离 guard 的正确挂法。

## 文件索引

| 文件 | 职责 |
| --- | --- |
| `tenant.controller.ts` | 示例路由：`GET /t/:tenantId/membership`（成员信息）、`GET /t/:tenantId/roles`（租户表查询示例） |
| `tenant-transaction.interceptor.ts` | 租户请求开事务并 `set_config('app.tenant_id', ..., true)`，把 tx 挂到 `req.tenantTx` |
| `tenant-tx.decorator.ts` | `@TenantTx()` 参数装饰器，取当前请求的事务客户端 |
| `dto/` | `RoleDto` 等租户路由出参，详见该目录 README |

## 关联

- `auth/tenant.middleware.ts`：从路由解析 tenantId，写入 `TenantContext`（AsyncLocalStorage）
- `auth/tenant-membership.guard.ts`：校验用户是否属于该租户（非成员 404 / 角色不足 403）
- `auth/membership.ts`：`@CurrentMembership()` / `@MinRole()` 装饰器
- `prisma/prisma.service.ts`：按 tenantId 自动注入 `where` 的 extension（管资源，guard 管人）
- `tenant-transaction.interceptor.ts`：租户请求开交互式事务并 `set_config('app.tenant_id', ..., true)`
- `docs/deliverables/20261127-base-infra-rls/02-tech-design.md`：数据库层 RLS 兜底方案与实施记录

## 同步要求

- 新增 `/t/:tenantId/...` 业务 controller **必须挂 `TenantMembershipGuard`**。否则 Prisma extension 只过滤了「资源属于该租户」，没有校验「用户属于该租户」，等于少了一道防线。
- 租户表（带 `tenantId`）由 Interceptor 放进事务，控制器用 `@TenantTx()` 参数装饰器取事务客户端查询；`tx` 不继承 Prisma extension，靠 RLS 兜底。未挂 Interceptor 的路由不要在事务外查租户表（RLS 会返回空）。
- `prisma.scoped` 只用于全局表（Tenant / User / UserTenant / Permission / PlatformAdmin / Plan）；关联表（UserRole / RolePermission / OAuthConnection）禁止直接查询，须从父表走 relation。
