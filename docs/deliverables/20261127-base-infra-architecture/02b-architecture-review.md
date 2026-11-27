# 基建架构审查（对照参考实现）

> 审查对象：`02-tech-design.md` 的分层架构 + 现有 base 代码。
> 参考资料：Azure SQL 官方多租户模式、NestJS 官方多租户教程、NestJS 官方 example 仓库（均为一手资料）。

## 1. 参考实现与我们的定位

| 参考 | 核心结论 | 对我们的启示 |
| --- | --- | --- |
| **Azure SQL《Multitenant SaaS Patterns》**（C~I 节） | 四种模式：C 独立应用+独立库、D 一套应用+每租户一库、E/F 共享库+行级隔离、G 分片、H 混合 | 我们是 **E/F（共享库 + tenantId 行级隔离）**；H「混合模型」证明单租户与多租户可以共用同一 schema |
| **NestJS 官方多租户教程** | `/orgs/:orgId` 路由解析 + `OrganizationGuard` 每请求查 membership；非成员 404、角色不足 403；双层检查（guard 管人、WHERE 管资源）；审计同事务；行锁防竞态；durable provider 按组织隔离 DI | 我们缺 membership guard 层、审计同事务约定、租户删除级联、并发兜底 |
| **nestjs/example-multi-tenant-saas** | 上述教程的完整可运行实现 + e2e 测试覆盖租户边界与并发竞态 | 说明这些不是纸上谈兵，可拿来做我们的对照测试基线 |

## 2. 单租户独立部署兼容性（核心结论）

**结论：没问题，而且「先做多租户、再退化成单租户」是正确的顺序。**

依据 Azure 文档 H 节（Hybrid sharded multitenant model）：

> 所有数据库都在 schema 里带 tenantId；每个库既能存多个租户也能只存一个租户；**库里租户数量不影响 schema**；租户可以随时在「独占库」和「共享库」之间移动。

对应到我们：

- 单租户部署 = seed 时只建一个默认 Tenant，所有请求的 tenantId 恒定
- Prisma extension 的 `where.tenantId` 注入照常工作（只是永远过滤到同一个租户）
- 平台层表（PlatformAdmin 等）在单租户下冗余，但不破坏功能
- feature 开关让单租户只迁移/启用需要的模块，反而更轻
- 反向改造（单租户 → 多租户）才痛苦：全表加列 + 全查询加条件 + 数据回填

**需要区分的两种「独立部署」（当前架构的边界）：**

| 诉求 | 是否支持 | 说明 |
| --- | --- | --- |
| 一套系统只服务一个客户、独立数据库实例 | ✅ 支持 | 就是 Azure C，我们的 schema 不改，seed 一个租户即可 |
| 一套应用、每个客户一个独立数据库（Azure D） | ⚠️ 需增量 | 要加 tenantId → 数据库连接路由；官方 durable provider 方案可直接借鉴，不影响现有架构 |
| 不同租户不同表结构 / 自定义字段索引 | ❌ 不支持 | 共享库模式做不到；metadata JSON 只能缓解字段扩展，不能支持索引定制 |

## 3. 审查发现的缺口

### P0 — 架构级，进入实施前必须补

**3.1 多对多改造后，JWT 固化的 tenantId 无法表达「用户属于多个租户」**

现状：`TenantMiddleware` 从 JWT payload 读 tenantId，`TenantContext` 全链路可用。一个 token = 一个租户。

多对多后一个用户可属于 A、B 两个租户，必须选一条「当前租户」解析路径：

- **A（推荐）**：路由带 tenantId（`/api/t/:tenantId/...`）+ guard 查 membership —— 最接近官方做法，天然支持多租户用户与实时失效
- B：header `X-Tenant-Id` + guard 查 membership —— 改动小，但依赖每个调用方都传
- C：提供「切换租户」端点重签 token —— 前端改动小，但成员变动有 TTL 延迟

架构文档当前未涉及这一决策，**是 P0 的前置条件**。

**3.2 缺少 membership guard（「用户属于该租户」这层校验）**

官方是双层检查：`OrganizationGuard` 查「用户是否属于该租户」，SQL WHERE 查「资源是否属于该租户」，缺一不可。

我们只有后者（Prisma extension），前者依赖「签发 token 时 tenantId 写对」。风险：

- 用户被移出租户后，旧 token 在 TTL 内仍可访问
- 多租户切换时若没有 guard，签错/伪造的 tenantId 不会被第二道防线拦住
- 官方对非成员返回 **404**（不泄露资源存在），角色不足才 403 —— 我们的授权设计未区分

需在架构里补 `TenantMembershipGuard`：解析当前租户 → 查 UserTenant → 非成员 404 → 角色不足 403 → 注入 membership 到请求。

### P1 — 安全/工程实践，实施时同步修

**3.3 `create` 的 tenantId 注入顺序反了（现有代码实锤）**

`prisma.service.ts:64`：`inject = (d) => ({ tenantId, ...d })` —— 业务 data 后展开，**业务传入的 tenantId 会覆盖注入值**。

而 `where` 注入是 `{ ...where, tenantId }`（注入值后置，正确）。

修法：`inject = (d) => ({ ...d, tenantId })`，强制以上下文为准。同时在 DTO 层 strip `tenantId` 字段。

**3.4 `prisma.scoped` 靠约定，可绕过**

当前业务都用 `this.prisma.scoped.user.findFirst()`（正确），但 `PrismaService extends PrismaClient`，所以 `this.prisma.user.findMany()` 也能编译通过且**完全绕过租户隔离**。

建议：不直接暴露裸 client，或加 lint 规则禁止 `prisma.<model>` 直连（只允许 `prisma.scoped.*`）；`$queryRaw` / `$executeRaw` 也需明确禁用或强制带 tenantId。

### P2 — 工程约定，写进规范即可

**3.5 审计日志要同事务写入** —— 官方 `audit(tx, entry)` 把日志写进变更所在事务；变更回滚日志也回滚。我们的 `@Audit()` 装饰器需约定「接收当前事务」，不能「业务提交后异步补写」。

**3.6 租户删除级联** —— 官方删 org 级联 memberships/projects/invitations/audit_events，无残留。我们的 Tenant 删除需覆盖 UserTenant / Role / TenantPermission / Customer / Setting / AuditLog / Notification；平台层表（PlatformAdmin）不级联。

**3.7 「最后管理员」并发竞态** —— 官方用 `SELECT ... FOR UPDATE` 锁租户行，防两个 owner 同时降级导致零 owner。我们的多对多 UserTenant 同样有此问题，需在成员管理约定里写明。

**3.8 角色模型取舍** —— 官方用 owner/admin/member 固定阶梯，并明确「权限超出阶梯时在 service 调 policy」。我们的自定义 Role + 继承 + TenantPermission 对「适配不同业务」合理，但建议 feature 分两档：`rbac-simple`（开箱阶梯）/ `rbac-custom`（自定义角色+继承），避免小项目被复杂度压垮。

**3.9 索引约定** —— 官方要求每个租户表的索引以 tenantId 开头。我们已有 `@@index([tenantId])`，但复合查询（如 tenantId + createdAt）需约定复合索引，否则列表页全表扫。

**3.10 feature 开关改造要同步全局表清单** —— `GLOBAL_MODELS`（`prisma.service.ts:7`）当前是 `Tenant / Permission / Plan`；改造后 Permission 要移出（变 TenantPermission），PlatformAdmin 要加入，否则权限过滤失效或平台表被错误过滤。

## 4. 建议动作顺序

1. **先补 3.1 + 3.2**（当前租户解析 + membership guard）——这是 P0 多对多改造的前置
2. P0 实施时顺手修 3.3 / 3.4 / 3.10（都是 PrismaService 周边的小改动）
3. 各基建模块落地时按 3.5~3.9 写进规范/README
4. 用官方 example 的 e2e 思路补「租户边界 + 并发竞态」测试（对应 AGENTS.md 里「单测/接口测试第一轮引入」）
