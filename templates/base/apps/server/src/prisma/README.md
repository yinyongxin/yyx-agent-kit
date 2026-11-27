# prisma — 数据访问与租户隔离

## 职责

`PrismaService` 继承 `PrismaClient`，按「全局表 / 关联表 / 租户表」三类提供不同入口：

- **全局表**：用 `prisma.scoped`
- **关联表**：禁止直接查询，从已过滤的父表走 relation
- **租户表**：用 `@TenantTx()` 取请求事务客户端，由数据库 RLS 过滤

## 文件索引

| 文件 | 职责 |
| --- | --- |
| `prisma.service.ts` | `scoped` 守卫（全局表放行、关联表/租户表 fail-closed、禁 raw SQL） |
| `prisma.module.ts` | `@Global()` 模块，导出 `PrismaService` |

## 隔离规则

| 分类 | 模型 | 入口 / 行为 |
| --- | --- | --- |
| 全局表 | Tenant / User / UserTenant / Permission / PlatformAdmin / Plan | `prisma.scoped` 直接查询；UserTenant 是 guard 查「当前租户」的入口，不能被隐式过滤 |
| 关联表 | UserRole / RolePermission / OAuthConnection | 无 tenantId 列，RLS 不保护；**禁止** `scoped` 直接查询，从父表走 relation |
| 租户表 | Role / Subscription 及后续带 `tenantId` 的业务表 | **必须**用控制器里的 `@TenantTx()` 事务客户端；`scoped` 会抛错 |

### 为什么租户表不能用 scoped

`scoped` 从 `PrismaClient` 派生，查询走连接池里的**另一条连接**，没有事务级 `app.tenant_id`；
RLS `ENABLE + FORCE` 后会被过滤成 0 行。因此它对租户表 fail-closed，强制走事务客户端。

### 被禁止的操作（会直接抛错）

- `scoped` 上访问租户表 / 关联表
- `scoped` 上的 raw SQL（`$queryRaw` / `$executeRaw` 及 Unsafe 版本）

## 同步要求

新增带 `tenantId` 的业务表时：

1. 写 RLS 迁移：`ENABLE` + `FORCE` + `policy`（`NULLIF(current_setting('app.tenant_id', true), '')::uuid`）
2. 控制器用 `@TenantTx()` 查询，不要用 `scoped`
3. 若迁移/模型漏了 RLS，`@TenantTx()` 上会返回**全表**（tx 不继承 extension），这是新表最大的坑
