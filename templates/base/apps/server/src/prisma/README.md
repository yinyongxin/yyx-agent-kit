# prisma — 数据访问与租户隔离

## 职责

`PrismaService` 继承 `PrismaClient`，提供 `scoped` 客户端：自动注入 `tenantId`，让业务代码不必每条查询手写租户条件。

## 文件索引

| 文件 | 职责 |
| --- | --- |
| `prisma.service.ts` | `scoped` extension：写入/查询注入 tenantId，并 fail-closed 禁用危险操作 |
| `prisma.module.ts` | `@Global()` 模块，导出 `PrismaService` |

## 隔离规则（务必遵守）

`scoped` 上的行为按模型分三类：

| 分类 | 模型 | 行为 |
| --- | --- | --- |
| 业务表 | 带 `tenantId` 列（如 Role / Subscription 及后续业务表） | `where` 与 `create` 自动注入当前租户 |
| 全局/授权关系表 | Tenant / User / UserTenant / PlatformAdmin / Permission / Plan | 不注入——UserTenant 是 guard 查「当前租户」的入口，不能隐式过滤 |
| 无 tenantId 列的关联表 | UserRole / RolePermission / OAuthConnection | 不注入，**禁止裸查**，必须从已过滤的父表走 relation，并显式带 `role.tenantId` |

### 被禁止的操作（会直接抛错）

- `findUnique` / `findUniqueOrThrow` / `update` / `delete` / `upsert`：唯一键定位，无法注入 tenantId → 改用 `findFirst` / `updateMany` / `deleteMany`
- raw SQL（`$queryRaw` / `$executeRaw` 及 Unsafe 版本）：完全绕过 extension → 改用 Prisma API

例外：全局表与授权关系表（UNSCOPED 列表）不受上述限制，guard 用 `userTenant.findUnique` 属于正常用法。seed 使用裸 `PrismaClient` 而非 `scoped`，也不受限。

## 同步要求

新增带 `tenantId` 的业务表时：索引以 `tenantId` 开头；禁止把表加进 `UNSCOPED_MODELS`（除非它确实没有该列或是授权关系表）；写仓储时只能用 `scoped`，不要直接用 `this.prisma.<model>`。
