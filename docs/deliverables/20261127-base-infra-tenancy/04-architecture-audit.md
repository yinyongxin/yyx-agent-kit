# 实施后架构审计（三轮）— 单租户 / 多租户 / 可复用基建

> 审查对象：`02-tech-design.md` 的决策 + `03-dev-log.md` 的已落地代码 + 前端接口层 + CLI。
> 结论先行：**身份与租户骨架已落地，但三个目标都还缺关键拼图，不能算「已支持」。**

## 第一轮：需求覆盖度对照

| 目标 | 当前状态 | 缺口 |
| --- | --- | --- |
| **单租户独立部署** | ⚠️ 架构兼容，产品未支持 | 技术上 seed 一个租户即可跑；但 CLI 无 feature 开关，生成项目仍带全套多租户/平台/订阅表；前端没有任何 tenantId 注入机制，业务要自己拼路径，违反「接口统一走 `@starter/api`」的约定 |
| **多租户** | ⚠️ 后端隔离有了，闭环没有 | guard 管人 + extension 管资源 + UserTenant 多对多已落地；但前端零适配（无租户切换器、SDK 无 tenantId 参数）、租户生命周期管理缺失（无创建租户/邀请成员/移除成员/分配角色端点）、PlatformAdmin 表建了但无任何代码使用 |
| **可复用基建** | ❌ 仅完成身份骨架 | `AuditLog` / `Setting` / `Customer` / `Notification` / metrics 一张表都没建；`Permission` 仍是全局表（未改 TenantPermission + module 分组）；Role 无继承；ABAC/scope 助手未做；CLI `--features` 开关未做 |

**结论**：当前交付的是「P0 身份与租户底座」，不是「可适配电商/工具平台的可复用基建」。

## 第二轮：落地代码质量审查

| 编号 | 严重度 | 发现 |
| --- | --- | --- |
| A1 | **高 → 已修** | `prisma.service.ts` 的 `WHERE_OPERATIONS` 原本不含 `update` / `delete` / `findUnique` / `upsert`，这些操作完全不注入 tenantId。现改为在 `scoped` 上 fail-closed 直接抛错，强制改用 `findFirst` / `updateMany` / `deleteMany` |
| A2 | **高 → 已修** | `$queryRaw` / `$executeRaw` 原本完全绕过 extension；现通过 `operation.toLowerCase().includes("raw")` 在 `scoped` 上直接抛错 |
| A3 | 中 | 嵌套 `create`（如 `create: { roles: { create: [...] } }`）的关联写入不会被 extension 拦截，子表 tenantId 不会自动注入 |
| A4 | 中 | `TenantMiddleware` 用正则从 `req.path` 提取 tenantId，guard 用 `req.params.tenantId`；异常 URL 下两者可能不一致（正常路径一致） |
| A5 | 中 → 已修 | 登录闭环已落地：`POST /api/auth/sign-in`（PasswordHasher + TokenService），seed 用户有 scrypt 哈希；e2e 验证 AC5/E1~E3 通过（见 `07-auth-login.md`）。AC1~AC4 仍需多租户测试数据 |
| A6 | 低 | 无上下文时访问非 `/t/:tenantId` 的业务路由会抛 500（fail-closed 但报错不友好），应引导到 404 或明确提示 |

## 第三轮：可复用性 / 接入契约审查

1. **前端接口层与后端路由不一致**：`packages/shared` 的 `API_ROUTES` 只有 `health`，`createApiClient` 没有 tenantId 参数机制。后端改成 `/t/:tenantId/...` 后，业务开发者若按 AGENTS.md 约定走 `@starter/api`，**没法带 tenantId**，只能绕过约定自己写 fetch。这是架构层面的断裂，不是某个页面没改的问题。
2. **CLI 没有 feature 开关**：`cli/bin/yyx-new.mjs` 只做整目录复制 + 字符串替换，选项仅 path / port-base / force。架构文档里「`--features=auth,rbac,audit,...`」目前只是设计，没有实现。
3. **基建能力没有接入契约**：架构文档说「核心表精简 + metadata JSON + 按需迁移启用」，但没定义业务表怎么接入数据权限（`ownerId` / `departmentId` 字段约定、scope 助手接口）。ABAC 未做，业务只能自己写 where。
4. **无 e2e 测试**：官方 example 仓库用 e2e 覆盖租户边界与并发竞态；我们没有任何测试文件，AC1~AC8 处于「代码写完但未验证」状态。

## 补齐优先级

| 优先级 | 动作 | 理由 |
| --- | --- | --- |
| ~~P0~~ | ~~修 A1/A2~~ **已完成**（scoped fail-closed 禁用，见 `src/prisma/README.md`） | 从「靠注释提醒」改为「运行时强制抛错」 |
| P0 | 前端接口层加 tenantId 机制：`API_ROUTES` 提供 `tenantPath(tenantId, path)`，`createApiClient` 支持当前租户 | 前后端契约断裂，业务无法按约定接入 |
| P1 | 租户生命周期 + 平台管理端点（创建租户、成员邀请/移除、角色分配、PlatformAdmin guard） | 多租户从「能隔离」到「能运营」 |
| ~~P1~~ | ~~登录闭环（password store + sign-in 端点）~~ **已完成**（`07-auth-login.md`）；补 e2e 覆盖 AC1~AC4 仍待做 | 部分完成 |
| P2 | 基建表与 feature 开关：AuditLog / Setting / Customer / Notification + CLI `--features` | 兑现「可复用基建」承诺 |
| P2 | TenantPermission（module 分组）+ Role 继承 + ABAC scope 助手 | 兑现「租户内定义权限 + 数据级权限」决策 |

## 第二轮审查（A1/A2 修复后复查）

| 编号 | 严重度 | 发现 | 状态 |
| --- | --- | --- | --- |
| B0 | **高** | A2 的修复**原本不生效**：Prisma 官方明确说明 `$allModels.$allOperations` 只拦截模型操作，raw query（`model === undefined`）根本不会触发。必须用顶层 `query.$allOperations` | **已修**：extension 改为顶层 `$allOperations`，raw 在 `model === undefined` 分支抛错 |
| B1 | 中 | Prisma 5.14+ 的 `createManyAndReturn` / `updateManyAndReturn` 不在注入清单里，会静默透传绕过 tenantId | **已修**：加入对应清单 |
| B2 | **高** | **交互式事务是 extension 的固有盲区**：多个权威来源（Prisma issue #17948 / #20738、multi-tenant-saas 实践指南）指出 `tx` 可能不继承 extension，事务内查询可绕过隔离；且 extension 里调用 client 级方法会脱离当前事务 | **未修**，见下方「根本性结论」 |
| B3 | 中 | 嵌套写入（`create` 里的 `roles: { create: [...] }`）不会被 extension 注入 tenantId；当前 Role.tenantId 必填会报错（fail-loud），但若子表字段可选就会写入空值 | 未修，靠规范约束 |

### 根本性结论（来自权威多租户实践）

> "Raw queries and interactive transactions are the two places a Prisma extension does not reach... the database-side policy remains the layer that decides what those paths can actually see."
> — multi-tenant-saas.com《Prisma Client Extensions for Tenant Scoping》

应用层 extension **不是完整的安全边界**。即使把能拦的都拦了，raw query、交互式事务、嵌套写入仍可能绕过。成熟方案要求叠加**数据库层 RLS（Row-Level Security）**：extension 负责注入 `SET app.tenant_id`，PostgreSQL 的 RLS policy 负责最终拒绝越权行。两层互补，不是冗余。

对我们而言：当前架构在应用层已尽量收紧（顶层拦截 + fail-closed），但缺少 RLS 兜底，因此**还不能说「隔离在架构层已闭环」**。这是后续 P0 级别的架构工作，且必须有 PostgreSQL 环境做并发验证。

## 一句话结论

**单租户**架构兼容但产品未支持（CLI 仍重、前端无适配）；**多租户**隔离机制在应用层已收紧但缺数据库层兜底，运营闭环也缺失；**可复用基建**目前只有身份骨架，四层和 feature 开关都还没落地。要真正支持你说的三个目标，至少还要完成 P0 + P1，其中 **RLS 兜底应排在最前**。
