# P0 前置：当前租户解析 + 成员校验 Guard — 技术方案

> 对应审查报告 `02b-architecture-review.md` 的两个 P0 缺口（3.1 / 3.2）。
> 这是 P0（User/Tenant 多对多改造）的前置决策，定案后再动 schema。

## 1. 必须一起解决的两件事

| 缺口 | 现状 | 改造后必须做到 |
| --- | --- | --- |
| 当前租户解析 | JWT payload 固化一个 `tenantId`，一个 token = 一个租户 | 一个用户可属于多个租户，每个请求能明确「本次操作哪个租户」 |
| 成员校验 | 只有 Prisma extension 的 `where.tenantId`（管资源），没有「用户属不属于该租户」的校验（管人） | guard 每请求查 UserTenant，非成员拒绝，角色不足拒绝 |

## 2. 决策一：当前租户解析路径

### 2.1 三个候选方案对比

| 维度 | A. 路由带 tenantId（推荐） | B. Header `X-Tenant-Id` | C. 切换租户重签 token |
| --- | --- | --- | --- |
| 与官方一致性 | 高（NestJS 官方教程即 `/orgs/:orgId/...`） | 中 | 低 |
| 多租户用户切换 | 天然（URL 即租户） | 需每个请求带头 | 需额外端点 + 前端状态 |
| 成员实时失效 | ✅ guard 每请求查 | ✅ guard 每请求查 | ❌ 旧 token TTL 内仍有效 |
| 链接可分享 / 可缓存 | ✅ URL 自带上下文 | ❌ | ❌ |
| 后端路由改动 | 大（业务路由加前缀） | 小 | 无 |
| 前端改动 | 中（拼 URL） | 小（加请求头） | 中 |
| 主要风险 | 漏加 guard 的路由会失去上下文（需全局约束） | 忘传头 → 上下文缺失报错 | 成员被移除后仍可访问 |

### 2.2 选定 A 的理由（2026-11-27 确认）

1. **官方验证过的路径**：NestJS 官方教程和 example 仓库都用 `/orgs/:orgId/...`，并配套 guard 查 membership
2. **上下文与资源绑定**：URL 里的 tenantId 和 guard 校验的是同一个值，避免「头里一个、资源另一个」的错配
3. **实时失效**：guard 每请求查 UserTenant，用户被移出租户后立即失效，不依赖 token TTL
4. **可调试/可分享**：一个 URL 就能复现某个租户下的问题，客服场景尤其有用

### 2.3 路由设计

```
/api/t/:tenantId/users
/api/t/:tenantId/orders
...
```

- 用全局前缀 + 业务 controller 上的 `@Controller("t/:tenantId/users")` 形式
- 健康检查、认证端点（sign-in / token refresh）、`GET /me/tenants` 不带 tenantId，走 `@Public()` 或只校验登录
- 单租户部署：seed 固定一个 Tenant，前端从配置读到它的 id 后照样拼进 URL；不引入 `current` 别名，避免两套解析逻辑

### 2.4 配套的租户列表端点

`GET /api/me/tenants` → 返回当前用户所属的所有租户（id / name / role / status）。前端首次进入时拉取，用于渲染租户切换器或拼出默认 URL。

## 3. 决策二：TenantMembershipGuard

### 3.1 职责（只做一件事：确认「这个人属于这个租户」）

```
1. 从 req.params.tenantId 取值（guard 在 pipe 之前，必须自己校验 UUID 格式，否则非法 id 打到 PG 会 500）
2. 查 UserTenant（userId 来自 @CurrentUser()，tenantId 来自路由），要求 status = active
3. 查不到 → 404 NotFoundException（与「租户不存在」同响应，不泄露资源存在）
4. 角色不足 → 403 ForbiddenException（用户知道租户存在，但权限不够）
5. 把 { tenantId, userId, role } 写入 TenantContext，并把 membership 挂到 request
6. 放行
```

### 3.2 为什么非成员返回 404 而不是 403

官方示例的明确选择：**403 会确认「这个租户 id 是真实存在的」**，给攻击者提供了枚举信息；404 让「不属于」和「不存在」无法区分。角色不足才返回 403——此时用户已经是成员，知道租户存在是合理的。

### 3.3 暴露给业务的装饰器

- `@CurrentMembership()` —— 注入 `{ tenantId, userId, role }`，业务 service 不再自己从请求里挖 tenantId
- `@MinRole("admin")` —— 声明路由最低角色（可选；复杂权限交给 service 调 policy，见决策三）

### 3.4 与 Prisma extension 的协作（关键顺序）

guard 写 TenantContext → Prisma extension 读它注入 `where.tenantId`。因此：

- **TenantMiddleware 职责收缩**：不再从 JWT payload 读 tenantId，只负责让认证包能工作（甚至可移除；认证由官方全局 guard 负责）
- guard 是 TenantContext 的唯一写入点（业务请求）；这样 tenantId 必然经过 membership 校验
- 全局查询（登录、租户列表、平台管理）不应走 `scoped`，用明确命名的入口（见 4.2）

## 4. 连锁改造清单（方案落地时必须同步）

### 4.1 User 表改造后不再有 tenantId

多对多后 `User` 是全局身份表。当前 `UsersRepository.findById/findByEmail` 用 `prisma.scoped.user.findFirst`，依赖 TenantContext——登录时没有 token、没有上下文，会抛「租户上下文缺失」。改造后：

- `findById(sub)` / `findByEmail(email)` 改为全局身份查询，不带 tenantId 过滤
- 登录/注册流程才用 `findByEmail`；业务请求的用户身份由 `@CurrentUser()` 提供

### 4.2 GLOBAL_MODELS 清单调整（`prisma.service.ts:7`）

| 表 | 改造前 | 改造后 | 原因 |
| --- | --- | --- | --- |
| Tenant | 全局 | 全局 | 平台层 |
| User | 租户表（有 tenantId） | **全局** | 改造后是多对多身份表，无 tenantId 列 |
| Permission | 全局 | 移出（变 TenantPermission，租户表） | 权限点租户内定义 |
| UserTenant | 不存在 | **全局（授权关系表）** | guard 要查它来确定 tenantId，不能被 extension 隐式过滤形成鸡生蛋 |
| PlatformAdmin | 不存在 | 全局 | 平台层 |
| Plan | 全局 | 全局 | 平台层 |

配套：把 `scoped` 的注释与「禁止裸 client 直连」的约定写进 README；全局查询统一走一个明确命名的 `global` 入口（或把上述表都放进 GLOBAL_MODELS 后沿用 `scoped`，但必须文档化哪些表是全局的）。

### 4.3 顺手修审查报告的 P1 两项

- `prisma.service.ts:64` 的 `inject` 改成 `{ ...d, tenantId }`（当前顺序反了，业务可覆盖注入值）
- 明确禁止 `prisma.user.findMany()` 这类裸 client 直连（靠 lint 规则或封装收口）

## 5. 验收标准

| 编号 | 验收 |
| --- | --- |
| AC1 | 用户属于 A、B 两个租户，用 `/t/A/...` 与 `/t/B/...` 分别访问，各自拿到对应租户数据 |
| AC2 | 用户不属于 C 租户，访问 `/t/C/...` 返回 404，且响应不说明 C 是否存在 |
| AC3 | 用户属于 C 但角色不足，访问需 admin 的路由返回 403 |
| AC4 | 用户被从 A 租户移除后，旧 token 访问 `/t/A/...` 立即 404（不等 token 过期） |
| AC5 | 无 token 访问业务路由返回 401；`@Public()` 的 health 正常 |
| AC6 | 单租户部署：seed 一个租户，前端拼固定 tenantId，全流程可用 |
| AC7 | `findByEmail` 在无 TenantContext 的登录流程中不抛「上下文缺失」 |
| AC8 | typecheck / lint 通过；补 e2e 覆盖 AC2~AC4（官方 example 的测试思路） |

## 6. 已确认决策（2026-11-27）

| 决策 | 结论 |
| --- | --- |
| 当前租户解析路径 | **A：路由带 tenantId**（`/api/t/:tenantId/...`）——官方同款，天然支持多租户切换、链接可分享，guard 每请求查 membership 实现实时失效 |
| 非成员响应码 | **404 Not Found**——与「租户不存在」同响应，不泄露租户存在；角色不足才 403 |

两项已定，可直接进入 P0 实施。
