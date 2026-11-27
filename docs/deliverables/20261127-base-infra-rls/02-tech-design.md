# 多租户兜底：PostgreSQL RLS — 技术方案

> 状态：**方案设计完成，尚未实施**。原因：本机无 PostgreSQL 环境，且 RLS 启用顺序错误会导致全库查询返回空，必须有数据库环境做分阶段验证。
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

`current_setting(..., true)` 在未设置时返回 NULL，`NULL = uuid` 结果为 NULL（非真）→ **未设置变量时拒绝所有行**（fail-closed）。

### 3.3 索引

所有租户表的索引以 `tenantId` 开头（已有 `@@index([tenantId])`），与 RLS policy 的过滤列一致，避免全表扫。

## 4. 应用层设计

### 4.1 请求级事务封装

提供 `TenantTransactionInterceptor`（或等价的 `withTenant()` 辅助），流程：

```
TenantMembershipGuard 校验成员身份（此时查 UserTenant，无 RLS）
  → Interceptor 开启交互式事务
  → tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
  → TenantContext 写入 { tenantId, tx }
  → Controller / Service 通过 TenantContext.getTx() 拿 tx 查询
  → 事务提交，LOCAL 变量自动失效
```

### 4.2 与 Prisma extension 的关系

- extension 继续注入 `where.tenantId`（应用层第一道）
- `tx` 不继承 extension，但 RLS 兜底（数据库层第二道）
- 业务 repository 统一从 TenantContext 取 `tx`，不再直接用 `prisma.scoped`

### 4.3 seed 适配

seed 用裸 `PrismaClient`（可能是表 owner，但 FORCE 后 owner 也受约束），需在开头显式：
```ts
await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${DEFAULT_TENANT_ID}, false)`;
```
`false` = session 级，seed 是短连接、无并发复用，可接受。

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
- **本机无法验证**：无 `.env` / docker / PostgreSQL。S2~S4 必须在有数据库的环境执行，否则只是纸面设计。
- **RLS 不是银弹**：它保护的是「设置了变量后」的查询；若应用忘记开启事务，policy 会拒绝一切（fail-closed，不会泄露，但会 500）。这是可接受的安全侧失败。

## 7. 结论与建议

RLS 是「可复用基建」真正可放心交付的最后一道地基。但它需要：

1. 数据库环境做端到端验证（本机不具备）
2. 一次覆盖所有 repository 的重构（S1）
3. 严格按 S1→S4 顺序上线

建议：**先交付本方案，待具备 PostgreSQL 环境后按阶段实施**；在此之前不要启用任何 RLS policy。当前应用层 extension + guard 仍是有效的第一道防线，只是不能宣称「架构层已闭环」。
