# tenancy — 租户上下文命名空间

## 职责

承载 `/t/:tenantId/...` 的租户内接口。`TenancyModule` 本身只保留租户上下文基础路由，成员 / 角色 / 权限目录各自是真正的 Nest 子模块。

## 文件索引

| 文件 | 职责 |
| --- | --- |
| `tenancy.module.ts` | 命名空间模块：imports 子模块，exports 给平台模块复用 |
| `tenancy-core.module.ts` | 租户公共设施：提供并导出 `TenantTransactionInterceptor` |
| `tenant.controller.ts` | `GET /t/:tenantId/membership`（当前用户成员信息） |
| `members/` | 子模块：租户成员管理，详见该目录 README |
| `roles/` | 子模块：租户角色 CRUD 与权限分配，详见该目录 README |
| `permission-catalog/` | 子模块：权限点目录（只读），详见该目录 README |
| `interceptors/` | `tenant-transaction.interceptor.ts`：开事务并 `set_config('app.tenant_id', ..., true)` |
| `decorators/` | `tenant-tx.decorator.ts`：`@TenantTx()` 取当前请求的事务客户端 |
| `dto/` | 租户路由共享出参（如 `RoleDto`） |

## 子模块约定

每个子目录都有 `<feature>.module.ts`：

```text
members/members.module.ts
roles/roles.module.ts
permission-catalog/permission-catalog.module.ts
```

- 子模块 `imports: [TenancyCoreModule]`，controller 才能解析 `TenantTransactionInterceptor`
- 需要给平台模块复用的 Service 由子模块 `exports`，`TenancyModule` 再 re-export
- Controller 仍统一挂 `TenantMembershipGuard`；不要绕过租户上下文直接查租户表

## 关联

- `auth/middleware/tenant.middleware.ts`：从路由解析 tenantId，写入 `TenantContext`
- `auth/guards/tenant-membership.guard.ts`：成员身份 + 角色 + `@RequirePermission`
- `auth/decorators/membership.decorator.ts`：`@CurrentMembership()` / `@MinRole()`
- `prisma/prisma.service.ts`：`scoped` 只用于全局表；租户表靠事务 + RLS
- `tenants/`：平台级租户 CRUD，复用本模块的 `MembersService` / `RolesService`
