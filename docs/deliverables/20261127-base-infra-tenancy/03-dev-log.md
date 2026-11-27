# P0 前置：当前租户解析 + 成员校验 Guard — 开发日志

## 已确认决策（2026-11-27）

- 当前租户解析：**A. 路由带 tenantId**（`/api/t/:tenantId/...`）
- 非成员响应：**404 Not Found**（与租户不存在同响应），角色不足才 403

## 改动清单

### Prisma schema（重建库）

| 文件 | 改动 |
| --- | --- |
| `prisma/schema.prisma` | 新增枚举 `UserTenantStatus` / `PlatformAdminLevel` |
| `prisma/models/user.prisma` | `User` 去 `tenantId`，`email` 改全局唯一；新增 `UserTenant`（userId+tenantId 复合主键，带 status/joinedAt） |
| `prisma/models/platform.prisma` | 新增 `PlatformAdmin`（userId + level，全局表） |
| `prisma/models/tenant.prisma` | 反向关系 `users` → `userTenants` |
| `prisma/migrations/` | 删旧 init 迁移，用 `prisma migrate diff --from-empty --to-schema prisma` 重建 `20261127120000_init` |
| `prisma/seed.ts` | 加示例用户 + UserTenant + admin 角色 + 平台管理员；`User` 不再写 tenantId |

### 运行时代码

| 文件 | 改动 |
| --- | --- |
| `src/prisma/prisma.service.ts` | `GLOBAL_MODELS` → `UNSCOPED_MODELS`，按「有无 tenantId 列」重梳理：加入 `User` / `UserTenant` / `PlatformAdmin`，并加入本来就会报错的 `UserRole` / `RolePermission` / `OAuthConnection`；修 create 注入顺序 `{ tenantId, ...d }` → `{ ...d, tenantId }`（原写法允许业务 data 覆盖上下文 tenantId，可跨租户写入） |
| `src/auth/tenant-context.util.ts` | 上下文只保留 tenantId；注明唯一写入点是 middleware，fail-closed |
| `src/auth/tenant.middleware.ts` | 由「从 JWT payload 读 tenantId」改为「从路由 `/t/:tenantId` 解析」，用 `TenantContext.run(ctx, next)` 包裹后续链（guard 内 run 无法传播到 controller）；兼容 Express 5 的 `string \| string[]` 参数类型 |
| `src/auth/tenant-membership.guard.ts` | 新增：`TenantMembershipGuard` 查 UserTenant（非成员 404）+ 查当前租户角色（`@MinRole` 等级不足 403）+ 挂 membership 到 request |
| `src/auth/membership.ts` | 新增 `Membership` / `ROLE_RANK` / `@MinRole` / `@CurrentMembership` |
| `src/auth/user.types.ts` | `User` 去 `tenantId`、去 `roles`（角色改由 guard 按租户查，避免跨租户混淆） |
| `src/auth/users.repository.ts` | 改为全局身份查询（不依赖租户上下文，修登录时抛「上下文缺失」的隐患） |
| `src/auth/auth.module.ts` | 注册并导出 `TenantMembershipGuard` |
| `src/auth/me.controller.ts` | 新增 `GET /api/me/tenants`（当前用户所属租户，供前端切换器） |
| `src/tenancy/tenant.controller.ts` | 新增示例路由 `GET /api/t/:tenantId/membership`（验证 guard） |
| `src/app.module.ts` | 注册两个新 controller；更新 middleware 注释 |

## 关键实现说明

1. **AsyncLocalStorage 的写入点必须是 middleware**：`run(ctx, fn)` 的上下文只在 `fn` 的异步链内有效。guard 的 `canActivate()` 返回后 Nest 才调用 controller，在 guard 里 `run` 会丢上下文。因此 middleware 负责写上下文（不做校验），guard 负责校验（不写上下文）。
2. **关联表必须显式按父表租户过滤**：`UserRole` / `RolePermission` 没有 tenantId 列，加入 UNSCOPED 后 extension 不注入过滤；guard 查角色时用 `where: { userId, role: { tenantId } }` 显式限定，否则会混进用户在其它租户的角色。
3. **`create` 注入顺序是实锤 bug**：原 `{ tenantId, ...d }` 让业务 data 可覆盖上下文 tenantId，改成后置注入。
4. **单租户兼容**：seed 只建默认租户，前端从 `/me/tenants` 拿到 id 后照常拼 `/t/:tenantId/...`，无需两套解析逻辑。

## 验证

- `pnpm --filter @starter/server typecheck`：通过
- `pnpm lint`：通过（仅既有 Fast refresh 警告）
- `prisma validate`：schema 合法
- `prisma generate`：生成物包含 `UserTenant` / `PlatformAdmin`（清理残留 ego-browser 进程释放内存后才跑通，本机物理内存紧张）
- `prisma migrate diff`：重建的 init SQL 含 `user_tenants` / `platform_admins` / `UserTenantStatus` / `users_email_key` / 级联外键

## 遗留（本机环境限制，非代码问题）

- 本机无 `.env`、无 docker、无后端进程与数据库，**AC1~AC8 的运行时端到端验证未执行**：迁移应用、seed、guard 的 404/403、租户切换、旧 token 立即失效等需在具备 PostgreSQL 的环境补测。
- 当前认证是最小闭环（无登录端点、无 password store），seed 用户只用于构造 token 验证 guard；真实登录流程仍待后续阶段补齐。
- `ROLE_RANK` 是简单阶梯（member/admin/owner），自定义角色与继承属 P1 RBAC 阶段；装饰器接口预留，届时替换实现即可。
- 全量 `pnpm build` 本机受 Rolldown OOM 影响未作为门禁。
