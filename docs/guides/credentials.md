# 本地开发默认凭据

模板 (`templates/base`) 项目自包含 Docker 环境的**本地开发默认值**。生产部署前**全部必须修改**，修改点见文末。

## 服务访问

| 服务 | 地址 | 账号 | 密码 |
| --- | --- | --- | --- |
| PostgreSQL（业务库 `app`，含认证状态表） | `localhost:54732` | `app` | `app_dev_pwd` |
| Redis（限流共享存储） | `localhost:46379` | - | `app_redis_pwd` |
| Penpot（设计工具） | `http://localhost:9001` | `dev@penpot.local` | `penpot_dev_pwd_2026` |

> Penpot 账号由官方 CLI 创建：`docker exec starter-penpot-backend python3 manage.py create-profile -n "Dev User" -e dev@penpot.local -p penpot_dev_pwd_2026 --skip-tutorial --skip-walkthrough`。本地 compose 带 `disable-email-verification`，不需要验证邮件。

> 认证/授权由 NestJS 官方包 `@nestjs/authentication` + `@nestjs/authorization` 实现，**没有独立 IdP 容器**。session / refreshToken / mfa / oidcState / emailToken 存进同一个 PostgreSQL（通过 store，见 `apps/server/src/auth/` TODO）。

## 初始化步骤

1. `cp .env.example .env`（模板仓库里 `.env` 不提交）
2. `docker compose up -d`（PostgreSQL + pgvector + Redis + Penpot 全套）
3. `pnpm --filter @starter/server prisma:generate`、`db:deploy`（按迁移文件建表）、`db:seed`（默认租户/角色/权限/套餐）
4. `pnpm dev:server` / `pnpm dev:admin` 启动

> **改了 `.env`（尤其 JWT_SECRET）必须重启服务**——env 在进程启动时读取，nest watch 只监听 TS 文件变化，不会因 .env 改动重启。

## 生产必改清单

| 项 | 说明 |
| --- | --- |
| `JWT_SECRET` | 至少 32 字节（`openssl rand -base64 32`）；官方包 HS256 强校验，短了启动失败 |
| `POSTGRES_PASSWORD` / `REDIS_PASSWORD` | 各服务密码 |
| `PENPOT_SECRET_KEY` / `PENPOT_DB_PASSWORD` / Penpot 账号 | 默认 `change-this-insecure-key` / `penpot` / `dev@penpot.local`，公网部署必须全换 |
| `accessToken.issuer` / `audience` | 按实际域名/应用设置（在 `auth.module.ts`） |
| 注册 6 个 store | 生产 `NODE_ENV=production` 下，官方包强制要求 sessions/refreshTokens/mfa/magicLinks/oidcStates/emailTokens 的 store，否则启动失败；见官网 `The store contract` |
| Google OAuth | `.env` 填 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`，配置 `oidc.providers` |
| SMTP | `SMTP_URL` 用真实邮件服务（开发 LogMailTransport 只打日志） |
| HTTPS + CSRF | session cookie 是 Secure；`app.enableCsrfProtection()`；配置 `session.trustedOrigins` |
| 微信扫码 | 非标准 OIDC，需自定义 provider（框架留口子） |
| 多平台一致性 | 共享用户库的每个应用，mfa / accessToken 配置必须一致，否则一个平台开 2FA 另一个能纯密码登录 |

> 不要在文档 / 提交里写生产密钥。本文件只有本地 dev 默认值。
