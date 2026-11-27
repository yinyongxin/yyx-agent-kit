# 登录闭环：密码 + sign-in 端点 — 技术方案与开发日志

> 对应 `04-architecture-audit.md` 的 A5 遗留与补齐优先级 P1。
> 目的：解锁 `02-tech-design.md` 的 AC1~AC8 端到端验证，同时补上 NodeAdapter 迁移文档里的运行时遗留项。

## 1. 方案

- **凭证**：Bearer JWT，不引入 session cookie（现有 `JwtBearerProvider` 已验证 access token）
- **密码**：`@nestjs/authentication` 的 `PasswordHasher`（scrypt，自描述哈希，未知用户走 dummy hash 防用户枚举）
- **签发**：`TokenService.issue(userId)`，与 `JwtBearerProvider` 共用 `accessToken` 配置
- **分层**：Controller 只做 DTO 校验与转发，验密/签发放在 `CredentialsService`
- **公开端点**：`POST /api/auth/sign-in` 用 `@Public()` 豁免认证 guard；`@Public()` 对 `@nestjs/authorization` 等价于 `@Can.Anyone()`，无需重复声明

## 2. 改动清单

| 文件 | 改动 |
| --- | --- |
| `prisma/models/user.prisma` | 新增 `passwordHash String?`（旧用户可为 null，无法密码登录） |
| `prisma/migrations/` | 走 `db:migrate -- --name user_password_hash` 生成迁移，禁止 `db:push` |
| `src/auth/users.repository.ts` | 新增 `findCredentials(email)`，返回 `{ user, passwordHash }` |
| `src/auth/credentials.service.ts` | 新增：验密（`PasswordHasher.verify`）+ 签发（`TokenService.issue`） |
| `src/auth/auth.controller.ts` | 新增 `POST /auth/sign-in`，`@Public()` 公开 |
| `src/auth/auth.module.ts` | 注册 controller / service，导出 CredentialsService |
| `src/main.ts` | 挂全局 `ValidationPipe`（whitelist + transform） |
| `prisma/seed.ts` | 示例用户写入密码哈希；开发密码记入 `docs/guides/credentials.md` |
| `package.json` | 新增 `class-validator` / `class-transformer` |

## 3. 验收标准（对应 AC）

| 编号 | 验收 |
| --- | --- |
| AC5 | 无 token 访问业务路由返回 401；`GET /api/health` 与 sign-in 正常 |
| AC7 | 登录流程的 `findByEmail` 在无 TenantContext 时不抛「上下文缺失」 |
| E1 | 正确密码返回 access token，错误密码/未知邮箱返回 401 且响应一致 |
| E2 | 拿到 token 后 `GET /api/me/tenants` 返回示例用户所属租户 |
| E3 | `GET /api/t/:tenantId/membership` 在正确 token 下返回成员信息 |

## 4. 验证

- `db:deploy` 应用 `20261127210000_user_password_hash`（`ALTER TABLE users ADD COLUMN passwordHash TEXT`），`migrate status` 为 up to date
- `db:seed` 写入示例用户的 scrypt 密码哈希
- `pnpm --filter @starter/server build` / 全量 typecheck 通过
- `apps/server/test/tenancy-e2e.mjs` 全部通过（11 项）：
  - AC5 health 公开 200、无 token 业务路由 401
  - E1 错误密码 / 未知邮箱均 401 且响应一致（防枚举）、正确密码 201 + token、响应不含密码字段
  - DTO 非法邮箱 / 空密码返回 400（全局 ValidationPipe 白名单生效）
  - E2 `GET /me/tenants` 返回默认租户
  - E3 `GET /t/:tenantId/membership` 返回成员信息（role=admin, status=active）
- 已验证 NodeAdapter 下 middleware → guard → controller 链路可用（membership 成功返回 tenantId）

## 5. 仍待验证

- AC1~AC4（跨租户数据隔离、非成员 404、角色不足 403、移除成员后旧 token 立即失效）：需要第二个租户 + 第二个用户，依赖 P1 租户生命周期端点，当前无法构造测试数据
- `req.params.tenantId` 在 middleware 阶段是否被 NodeAdapter 填充：membership 成功说明解析链路可用，但无法区分走的是 params 还是 `req.path` 正则兜底
