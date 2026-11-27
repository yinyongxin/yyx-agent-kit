# tenancy — 租户上下文路由

## 职责

提供 `/t/:tenantId/...` 的示例 controller，演示租户隔离 guard 的正确挂法。

## 文件索引

| 文件 | 职责 |
| --- | --- |
| `tenant.controller.ts` | 示例路由 `GET /t/:tenantId/membership`，挂 `TenantMembershipGuard`，返回当前成员信息 |

## 关联

- `auth/tenant.middleware.ts`：从路由解析 tenantId，写入 `TenantContext`（AsyncLocalStorage）
- `auth/tenant-membership.guard.ts`：校验用户是否属于该租户（非成员 404 / 角色不足 403）
- `auth/membership.ts`：`@CurrentMembership()` / `@MinRole()` 装饰器
- `prisma/prisma.service.ts`：按 tenantId 自动注入 `where` 的 extension（管资源，guard 管人）

## 同步要求

新增 `/t/:tenantId/...` 业务 controller **必须挂 `TenantMembershipGuard`**。否则 Prisma extension 只过滤了「资源属于该租户」，没有校验「用户属于该租户」，等于少了一道防线。
