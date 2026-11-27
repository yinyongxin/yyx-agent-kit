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
| A1 | **高** | `prisma.service.ts` 的 `WHERE_OPERATIONS` **不含 `update` / `delete` / `findUnique` / `upsert`**。这些操作完全不注入 tenantId，业务写 `prisma.scoped.role.update({ where: { id } })` 就能跨租户改数据。目前只靠注释提醒，没有机制强制。对比 NestJS 官方教程——它是每个查询显式带 orgId，不会漏 |
| A2 | **高** | `$queryRaw` / `$executeRaw` 完全绕过 extension，没有禁用或强制约定 |
| A3 | 中 | 嵌套 `create`（如 `create: { roles: { create: [...] } }`）的关联写入不会被 extension 拦截，子表 tenantId 不会自动注入 |
| A4 | 中 | `TenantMiddleware` 用正则从 `req.path` 提取 tenantId，guard 用 `req.params.tenantId`；异常 URL 下两者可能不一致（正常路径一致） |
| A5 | 中 | 认证仍是最小闭环：无登录端点、无 password store，seed 用户没有密码哈希，无法登录——这意味着 guard 的 404/403 与租户切换**无法端到端验证** |
| A6 | 低 | 无上下文时访问非 `/t/:tenantId` 的业务路由会抛 500（fail-closed 但报错不友好），应引导到 404 或明确提示 |

## 第三轮：可复用性 / 接入契约审查

1. **前端接口层与后端路由不一致**：`packages/shared` 的 `API_ROUTES` 只有 `health`，`createApiClient` 没有 tenantId 参数机制。后端改成 `/t/:tenantId/...` 后，业务开发者若按 AGENTS.md 约定走 `@starter/api`，**没法带 tenantId**，只能绕过约定自己写 fetch。这是架构层面的断裂，不是某个页面没改的问题。
2. **CLI 没有 feature 开关**：`cli/bin/yyx-new.mjs` 只做整目录复制 + 字符串替换，选项仅 path / port-base / force。架构文档里「`--features=auth,rbac,audit,...`」目前只是设计，没有实现。
3. **基建能力没有接入契约**：架构文档说「核心表精简 + metadata JSON + 按需迁移启用」，但没定义业务表怎么接入数据权限（`ownerId` / `departmentId` 字段约定、scope 助手接口）。ABAC 未做，业务只能自己写 where。
4. **无 e2e 测试**：官方 example 仓库用 e2e 覆盖租户边界与并发竞态；我们没有任何测试文件，AC1~AC8 处于「代码写完但未验证」状态。

## 补齐优先级

| 优先级 | 动作 | 理由 |
| --- | --- | --- |
| P0 | 修 A1/A2：`update` / `delete` / `findUnique` / `upsert` 纳入注入或禁用；显式禁用 raw 查询 | 当前隔离可被绕过，是多租户的地基裂缝 |
| P0 | 前端接口层加 tenantId 机制：`API_ROUTES` 提供 `tenantPath(tenantId, path)`，`createApiClient` 支持当前租户 | 前后端契约断裂，业务无法按约定接入 |
| P1 | 租户生命周期 + 平台管理端点（创建租户、成员邀请/移除、角色分配、PlatformAdmin guard） | 多租户从「能隔离」到「能运营」 |
| P1 | 登录闭环（password store + sign-in 端点），补 e2e 覆盖 AC1~AC4 | 否则所有 guard 行为都只是代码层推断 |
| P2 | 基建表与 feature 开关：AuditLog / Setting / Customer / Notification + CLI `--features` | 兑现「可复用基建」承诺 |
| P2 | TenantPermission（module 分组）+ Role 继承 + ABAC scope 助手 | 兑现「租户内定义权限 + 数据级权限」决策 |

## 一句话结论

**单租户**架构兼容但产品未支持（CLI 仍重、前端无适配）；**多租户**隔离机制已立但运营闭环缺失且有可绕过的裂缝；**可复用基建**目前只有身份骨架，四层和 feature 开关都还没落地。要真正支持你说的三个目标，至少还要完成上表 P0 + P1。
