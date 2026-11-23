# 本地开发默认凭据

模板 (`templates/base`) 项目自包含 Docker 环境的**本地开发默认值**。生产部署前**全部必须修改**，修改点见文末。

## 服务访问

| 服务 | 地址 | 账号 | 密码 |
| --- | --- | --- | --- |
| PostgreSQL（业务库 `app`） | `localhost:54732` | `app` | `app_dev_pwd` |
| PostgreSQL（IdP 库 `authentik`） | `localhost:54732` | `authentik` | `authentik_dev_pwd` |
| Redis | `localhost:46379` | - | `app_redis_pwd` |
| Authentik 管理界面 | http://localhost:9000 | `akadmin` | `admin_dev_pwd`（邮箱 `admin@localhost`，已初始化）|

## 初始化步骤

1. `cp .env.example .env`（模板仓库里 `.env` 不提交）
2. `docker compose up -d`，首次 Authentik 迁移约 55 秒
3. 打开 http://localhost:9000，用 `akadmin` / `admin_dev_pwd` 登录（模板已预置初始设置，邮箱 `admin@localhost`；若重建容器则需重新走初始设置向导，自己设密码并同步更新本文件）
4. 在 Admin 界面配置 Google OAuth source 和 OIDC provider（应用客户端）

## 生产必改清单

| 文件 | 项 | 说明 |
| --- | --- | --- |
| `.env` | `AUTHENTIK_SECRET_KEY` | 用 `openssl rand -base64 60` 生成，改了会失效所有会话 |
| `.env` | `POSTGRES_PASSWORD` / `REDIS_PASSWORD` / `AUTHENTIK_DB_PASSWORD` | 各服务密码 |
| Authentik 后台 | `akadmin` 密码 | 首次登录后立刻改掉 `admin_dev_pwd` |
| `docker/init-db.sql` | `CREATE USER authentik WITH PASSWORD '...'` | SQL 不支持环境变量替换，必须与 `.env` 的 `AUTHENTIK_DB_PASSWORD` 同步改 |
| `docker/init-db.sql` | 业务库初始化 | dev 默认值仅用于本地 |

> 不要在文档 / 提交里写生产密钥。本文件只有本地 dev 默认值。
