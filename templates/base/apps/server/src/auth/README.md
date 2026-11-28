# auth — 认证与授权

## 职责

用 `@nestjs/authentication` + `@nestjs/authorization` 实现登录闭环、租户成员校验与上下文注入。

## 文件索引

| 文件 | 职责 |
| --- | --- |
| `auth.module.ts` | 装配官方模块；JWT 签发参数、`refreshToken: false`、生产密钥校验 |
| `auth.controller.ts` | `POST /auth/sign-in`（`@Public()`），只做 DTO 校验与转发 |
| `credentials.service.ts` | 验密（`PasswordHasher.verify`）+ 签发（`TokenService.issue`） |
| `repositories/` | `users.repository.ts`：全局身份查询、租户列表、登录凭据读取（密码哈希不出本层） |
| `providers/` | `jwt-auth.provider.ts`：Bearer JWT 凭证 provider，按 sub 加载用户 |
| `me.controller.ts` | `GET /me/tenants`，返回当前用户所属租户 |
| `dto/` | `SignInDto` / `SignInResponseDto` / `TenantSummaryDto` / `MembershipDto`，详见该目录 README |
| `middleware/` | `tenant.middleware.ts`：从 `/t/:tenantId` 解析租户并写 `TenantContext`（不做校验） |
| `guards/` | `tenant-membership.guard.ts`：校验用户属于该租户（非成员 404 / 角色或权限不足 403） |
| `decorators/` | `membership.decorator.ts`：`@CurrentMembership()` / `@MinRole()`；`permission.decorator.ts`：`@RequirePermission()` |
| `membership.types.ts` | `Membership` 类型（含 `permissions` 并集）与 `ROLE_RANK` 等级表 |
| `tenant-context.util.ts` | AsyncLocalStorage 租户上下文，fail-closed |
| `user.types.ts` | 对外用户类型（不含 passwordHash） |

## 关联

- `src/prisma/prisma.service.ts`：`scoped` 只用于全局表；租户表用 `@TenantTx()` 事务客户端 + 数据库 RLS
- `src/tenancy/tenant.controller.ts`：`/t/:tenantId/...` 示例路由
- `test/tenancy-e2e.mjs`：登录与租户边界接口验收
- `docs/guides/credentials.md`：本地开发账号与生产必改清单

## 同步要求

- 新增 `/t/:tenantId/...` 业务 controller **必须挂 `TenantMembershipGuard`**；需要写权限的接口加 `@RequirePermission(PERMISSIONS.xxx)`，不要只依赖 `@MinRole`
- 密码哈希只能留在 Repository / Seed，禁止出现在任何对外响应与日志
- 改动登录行为必须同步更新 `test/tenancy-e2e.mjs` 与 `docs/guides/credentials.md`
- `PasswordHasher` 复用 `AuthenticationModule` 导出的实例，不要在本模块重复注册
