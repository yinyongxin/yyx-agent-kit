# 本地开发默认凭据

模板 (`templates/base`) 项目自包含 Docker 环境的**本地开发默认值**。生产部署前**全部必须修改**，修改点见文末。

## 服务访问

| 服务 | 地址 | 账号 | 密码 |
| --- | --- | --- | --- |
| PostgreSQL（bootstrap superuser，仅建库/迁移用） | `localhost:54732` | `app` | `app_dev_pwd` |
| PostgreSQL（应用连接，非 superuser，RLS 生效必需） | `localhost:54732` | `app_rw` | `app_rw_pwd_2026` |
| Redis（限流共享存储） | `localhost:46379` | - | `app_redis_pwd` |
| Penpot（独立 `tools/penpot`） | `http://localhost:9001` | `dev@penpot.local` | `penpot_dev_pwd_2026` |
| Grafana（可观测性，可选 profile） | `http://localhost:47111` | `admin` | `starter_grafana_2026` |
| 应用登录（seed 用户） | `POST http://localhost:47100/starter/api/auth/sign-in` | `admin@example.com` | `seed_pwd_2026` |
| 应用登录（演示账号） | 同上 | 见下方演示账号表 | `demo_pwd_2026` |

### 演示账号（`pnpm --filter @starter/server db:seed:demo`）

| 场景 | 邮箱 | 说明 |
| --- | --- | --- |
| 平台超管 | `demo.platform@example.com` | 平台管理，不加入租户 |
| 平台运维 | `demo.ops@example.com` | 平台只读，租户成员写操作受限 |
| 租户管理员 | `demo.tenantadmin@example.com` | 默认租户 `admin` |
| 普通成员 | `demo.member@example.com` | 默认租户 `member`（只读） |
| 文件管理员 | `demo.files@example.com` | 默认租户自定义角色，仅文件读写 |
| 多租户用户 | `demo.multi@example.com` | 默认租户 `member` + 演示租户 B `admin` |
| 已停用成员 | `demo.suspended@example.com` | 登录成功但没有可用租户 |
| 禁用账号 | `demo.disabled@example.com` | 登录直接 401 |

演示账号统一密码 `demo_pwd_2026`（可用 `DEMO_USER_PASSWORD` 覆盖）。

也可以在开发导航页 `http://localhost:47100/starter/api/dev#tools` 的「演示账号」卡片点击「重置演示账号」，无需命令行。

### 清理测试租户

端到端测试会在本地库留下软删除的测试租户（`e2e-*` / `audit-*` / `prov-*` / `ui-*` / `ego-*` / `test`）。清理：

```bash
pnpm --filter @starter/server db:cleanup:test-tenants          # 预演
pnpm --filter @starter/server db:cleanup:test-tenants -- --apply
```

只删除软删除测试租户及其角色/成员/文件/订阅，保留 `default`、`demo-b` 和审计日志。

> 以上账号密码会在开发导航页 `http://localhost:47100/starter/api/dev#services` 的「本地凭据」卡片统一展示（点击值可复制）；该页仅开发环境注册，生产返回 404。

> Penpot 账号由官方 CLI 创建：`docker exec yyx-penpot-backend python3 manage.py create-profile -n "Dev User" -e dev@penpot.local -p penpot_dev_pwd_2026 --skip-tutorial --skip-walkthrough`。本地 compose 带 `disable-email-verification`，不需要验证邮件。

> 认证/授权由 NestJS 官方包 `@nestjs/authentication` + `@nestjs/authorization` 实现，**没有独立 IdP 容器**。session / refreshToken / mfa / oidcState / emailToken 存进同一个 PostgreSQL（通过 store，见 `apps/server/src/auth/` TODO）。

## 初始化步骤

1. `cp .env.example .env`（模板仓库里 `.env` 不提交）；`DATABASE_URL` 用 `app_rw`——superuser 带 `BYPASSRLS`，会让 RLS 多租户兜底失效；`MIGRATE_DATABASE_URL` 用 bootstrap 账号（迁移/`migrate dev` 影子库需要）（见 `docs/deliverables/20261127-base-infra-rls/02-tech-design.md`）
2. `docker compose up -d`（PostgreSQL + pgvector + Redis）；Penpot 单独启动：`pwsh -NoProfile -File tools/penpot/start.ps1`
3. `pnpm --filter @starter/server prisma:generate`、`db:deploy`（按迁移文件建表）、`db:seed`（默认租户/角色/权限/套餐）；需要体验多场景账号时再跑 `db:seed:demo`
4. `pnpm dev:server` / `pnpm dev:admin` 启动
5. `pnpm --filter @starter/server test:e2e`（服务在跑时验证登录与租户边界；seed 密码可用 `SEED_USER_PASSWORD` 覆盖）

> **改了 `.env`（尤其 JWT_SECRET）必须重启服务**——env 在进程启动时读取，nest watch 只监听 TS 文件变化，不会因 .env 改动重启。

> **已有数据库升级**：`docker/init-db.sql` 只对空数据卷生效。已运行过的库执行一次 `docker/upgrade-rls.sql`（创建 `app_rw`、交回表 owner、按最小权限授权），细节见 `docs/deliverables/20261127-base-infra-rls/02-tech-design.md` 实施记录。

## 生产必改清单

| 项 | 说明 |
| --- | --- |
| `JWT_SECRET` | 至少 32 字节（`openssl rand -base64 32`）；官方包 HS256 强校验，短了启动失败 |
| `POSTGRES_PASSWORD` / `REDIS_PASSWORD` | 各服务密码 |
| `app_rw` 密码（`docker/init-db.sql` 与 `DATABASE_URL`） | 必须非 superuser / 无 BYPASSRLS，否则 RLS 失效；改密码时两处同步 |
| Penpot 密钥 / 账号 | 在 `tools/penpot/.env` 修改 `PENPOT_SECRET_KEY` / `PENPOT_DB_PASSWORD`；默认账号 `dev@penpot.local`，公网部署必须全部修改 |
| `accessToken.issuer` / `audience` | 按实际域名/应用设置（在 `auth.module.ts`） |
| 注册 6 个 store | 生产 `NODE_ENV=production` 下，官方包强制要求 sessions/refreshTokens/mfa/magicLinks/oidcStates/emailTokens 的 store，否则启动失败；见官网 `The store contract` |
| Google OAuth | `.env` 填 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`，配置 `oidc.providers` |
| SMTP | `SMTP_URL` 用真实邮件服务（开发 LogMailTransport 只打日志） |
| HTTPS + CSRF | session cookie 是 Secure；`app.enableCsrfProtection()`；配置 `session.trustedOrigins` |
| 微信扫码 | 非标准 OIDC，需自定义 provider（框架留口子） |
| 多平台一致性 | 共享用户库的每个应用，mfa / accessToken 配置必须一致，否则一个平台开 2FA 另一个能纯密码登录 |

> 不要在文档 / 提交里写生产密钥。本文件只有本地 dev 默认值。
