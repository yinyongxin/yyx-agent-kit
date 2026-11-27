# 多租户兜底：PostgreSQL RLS — 技术方案

> 状态：**S1~S4 已实施并验证**（2026-11-27）。原阻塞理由（本机无 PostgreSQL）已解除；按分阶段顺序落地，实施偏差见文末「实施记录」。
> 依据：`20261127-base-infra-tenancy/04-architecture-audit.md` 第二轮审查 B2/B3 的根本性结论。

## 1. 为什么需要 RLS

应用层 Prisma extension 已做到：写入/查询自动注入 `where.tenantId`、禁用无法注入的操作与 raw SQL。但权威实践一致指出 extension **不是完整安全边界**：

- 交互式事务 `$transaction(async tx => ...)` 的 `tx` 可能不继承 extension（Prisma issue #17948 / #20738）
- 嵌套写入（`create` 里的 `roles.create`）不会被顶层 extension 拦截
- 任何未来新增的绕过路径都不会自动被覆盖

RLS 是数据库层的独立防线：即使应用层漏了，PostgreSQL 也会拒绝越权行。两层互补，不是冗余。

## 2. 关键约束：必须在事务内 SET LOCAL

**不能**用 session 级 `SET app.tenant_id`：Prisma 从连接池取连接，`SET` 和后续查询**可能用不同连接**，session 变量不共享；且连接复用会把上一个请求的租户带到下一个请求。

**必须**用交互式事务 + `set_config('app.tenant_id', ?, true)`（第三个参数 `true` = LOCAL，事务结束自动清理），事务内所有查询走同一个连接、`tx` 客户端。

## 3. 数据库层设计

### 3.1 启用范围

| 分类 | 表 | RLS |
| --- | --- | --- |
| 租户表 | Role、Subscription 及后续所有带 `tenantId` 的业务表 | 启用 + FORCE |
| 全局表 | Tenant、User、Permission、Plan、PlatformAdmin | 不启用 |
| 授权关系表 | UserTenant | **不启用**——guard 需要在无变量时查它来确定租户（鸡生蛋） |
| 无 tenantId 的关联表 | UserRole、RolePermission、OAuthConnection | 不启用——通过父表（Role）+ RLS 间接保护 |

### 3.2 Policy 模板（每张租户表）

```sql
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
-- FORCE：让表 owner 也受约束（应用连接用户可能是 owner，不 FORCE 会绕过）
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "roles"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);
```

`current_setting(..., true)` 在未设置时返回 NULL，`NULL = uuid` 结果为 NULL（非真）→ **未设置变量时拒绝所有行**（fail-closed）。注意 `RESET` 后返回的是空字符串而非 NULL，实际 policy 用 `NULLIF(..., '')` 兜底（见实施记录）。

### 3.3 索引

所有租户表的索引以 `tenantId` 开头（已有 `@@index([tenantId])`），与 RLS policy 的过滤列一致，避免全表扫。

## 4. 应用层设计

### 4.1 请求级事务封装

提供 `TenantTransactionInterceptor`（或等价的 `withTenant()` 辅助），流程：

```
TenantMembershipGuard 校验成员身份（此时查 UserTenant，无 RLS）
  → Interceptor 开启交互式事务
  → tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
  → req.tenantTx = tx（不用 AsyncLocalStorage：Prisma 事务回调与 Nest 调度会丢上下文）
  → Controller 用 @TenantTx() 参数装饰器取 tx 查询
  → 事务提交，LOCAL 变量自动失效
```

### 4.2 与 Prisma extension 的关系

- 租户表：控制器用 `@TenantTx()` 事务客户端，数据库 RLS 过滤；`tx` 不继承 extension，不依赖自动 where 注入
- 全局表用 `prisma.scoped`；关联表禁止直接查询，从父表走 relation
- 应用层入口收口（`scoped` 对租户表 fail-closed）+ 数据库层 RLS，两层互补

### 4.3 seed 适配

seed 用裸 `PrismaClient`（可能是表 owner，但 FORCE 后 owner 也受约束），需在开头显式：
```ts
await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${DEFAULT_TENANT_ID}, false)`;
```
> 实施时已改为整个 seed 在 `$transaction` 内用 `set_config(..., true)`：Prisma 连接池不保证 session 变量与后续查询在同一条连接上。

## 5. 分阶段上线（顺序不可颠倒）

| 阶段 | 动作 | 验证点 |
| --- | --- | --- |
| S1 | 只改应用代码：加 Interceptor、改造 repository 用 tx、seed 设置变量。**不启用 RLS** | 现有功能全绿（typecheck / health / 租户边界 e2e） |
| S2 | 迁移 SQL 加 RLS policy，但先 `ENABLE`（不加 `FORCE`），且应用连接用户**非表 owner** | 应用功能仍全绿；故意越权查询被 policy 拒绝 |
| S3 | 加 `FORCE ROW LEVEL SECURITY` | 重复越权测试；seed 仍能跑通 |
| S4 | 补并发验证：30 并发请求交替访问两个租户，断言 0 次串数据（参考 Azure 文档与官方 example 的测试思路） | 0 串数据 |

**关键**：S1 必须在 S2 之前。若先启用 policy 而应用还没设置变量，所有租户表查询都会返回空，系统直接不可用。

## 6. 风险与取舍

- **交互式事务持有连接**：默认 5s 超时、maxWait 2s；高并发下连接池可能耗尽。需要按官方建议调 timeout 并限制事务内不做慢 IO。
- **改造面大**：所有 repository 要从 `prisma.scoped` 改为 `TenantContext.getTx()`；这是 P0 级重构，不能草率。
- **环境验证**：S1~S4 已在本地 PostgreSQL（Docker）完成，见第 8 节实施记录。
- **RLS 不是银弹**：它保护的是「设置了变量后」的查询；若应用忘记开启事务，policy 会拒绝一切（fail-closed，不会泄露，但会 500）。这是可接受的安全侧失败。

## 7. 结论与建议

RLS 是「可复用基建」真正可放心交付的最后一道地基。但它需要：

1. 数据库环境做端到端验证（本机不具备）
2. 一次覆盖所有 repository 的重构（S1）
3. 严格按 S1→S4 顺序上线

实施结论：已按 S1→S4 完成并验证（S1 必须先于 policy 启用）。运行前提是应用连接使用非 superuser 的 `app_rw`；租户表查询统一在 `@TenantTx()` 事务客户端上执行。

---

## 8. 实施记录（2026-11-27）

| 阶段 | 落地 | 验证 |
| --- | --- | --- |
| S1 | `TenantTransactionInterceptor` 在 `/t/:tenantId/...` 开交互式事务并 `set_config(..., true)`；tx 经 `req.tenantTx` + `@TenantTx()` 传给控制器；seed 整体在事务内。不启用 policy | `pnpm --filter @starter/server test:e2e` 12 项全通过（含应用层 roles=2） |
| S2+S3 | 迁移 `20261127220000_rls_tenant_isolation` 对 `roles` / `subscriptions` 加 policy + ENABLE + FORCE | policy 对正确租户返回 2 行、错误租户返回 0 行 |
| S4 | `test/rls-concurrency.mjs`：脚本创建真实租户 B + 2 角色，30 并发交替 A/B | 15/15 分配，A 每次 2 行、B 每次 2 行、互不可见，**0 次串数据**；另验证「未设置变量 → 0 行」 |

### 与原方案的偏差（均为实测后的必要修正）

1. **S2/S3 合并**：模板应用连接用户就是表 owner，只 `ENABLE` 不 `FORCE` 时 owner 会绕过 policy，等于没启用；原方案「非 owner 应用用户」在本模板的部署模型下不成立，故同一迁移里直接 ENABLE + FORCE。
2. **必须换非 superuser 账号**：bootstrap superuser（`app`）带 `BYPASSRLS`，superuser 永远绕过 RLS 且 PostgreSQL 禁止 bootstrap superuser 放弃 SUPERUSER。新增 `app_rw`（`docker/init-db.sql` 创建并授权，非 superuser），`DATABASE_URL` 改用它；`MIGRATE_DATABASE_URL` 保留 bootstrap 账号做迁移。已有库执行 `docker/upgrade-rls.sql`：把表 owner 交回 bootstrap、收回 `app_rw` 的 DDL/多余权限。
3. **`NULLIF` 修正**：`RESET app.tenant_id` 后 `current_setting(..., true)` 返回空字符串而非 NULL，直接 `::uuid` 会抛 `invalid input syntax`。新迁移 `20261127223000_rls_nullif_fix` 用 `NULLIF(..., '')` 保证 fail-closed 且不报错。已应用迁移不手改，走新迁移。
4. **guard 的角色查询必须包事务**：`TenantMembershipGuard` 在 Interceptor 之前运行，关联到已启用 RLS 的 `role` 表时没有事务变量，导致角色被过滤成 `member`。已改为在 guard 内开短事务设置 `app.tenant_id`；e2e 增加 `role === "admin"` 断言防回归。

### 复现命令

```bash
# 已有数据库：先执行一次 docker/upgrade-rls.sql（新建库由 docker/init-db.sql 自动完成）
pnpm --filter @starter/server db:deploy     # 应用全部迁移（MIGRATE_DATABASE_URL）
pnpm --filter @starter/server db:seed       # seed 在事务内设置 app.tenant_id
pnpm --filter @starter/server start
pnpm --filter @starter/server test:e2e      # 12 项
pnpm --filter @starter/server test:rls      # 真实双租户 30 并发 0 串数据
```
