# starter

`yyx-agent-kit` 的项目模板，也是 CLI 生成新项目的复制源。全局配置不受影响，本项目启用 `chief` 走交付流水线。

## 打开方式

**必须在 `templates/base` 目录打开 OpenCode**，不要打开仓库根目录。原因：`.opencode/opencode.json` 里的 `skills` 是相对路径 `../../skills`，按工作目录解析。

```powershell
cd F:\project\yyx-agent-kit\templates\base
opencode
```

clone 到其他机器后路径不同也没关系，相对路径会跟着走。

## 结构

```text
apps/
├── client/     客户端   React 19 + Vite 8 + TS 7 + Tailwind 4   47173
├── admin/      管理端   React 19 + Vite 8 + TS 7 + Tailwind 4   47174
├── portal/     门户     Next.js 16 App Router + TS 7 + Tailwind 4  47175
└── server/     后端     NestJS 12 + TS 6                        47100，路由前缀 /api
packages/
├── shared/     常量、路由表、业务枚举、类型（TS 源码直供）
└── api/        接口层：类型、SDK、错误处理
docs/           需求交付物，按 docs/deliverables/<slug>/ 存放
```

工程约定见 `AGENTS.md`。

## 本地依赖环境（Docker）

项目自带独立的 Docker 环境，**不依赖全局 local-dev-docker-container**，每个项目一套容器 / volume / 网络，名字带项目前缀，多项目并存不冲突。

```powershell
cp .env.example .env          # 按需改端口和密码；生产务必改 JWT_SECRET（≥32 字节）
docker compose up -d          # 起 PostgreSQL(pgvector) + Redis
docker compose ps             # 查看状态（含 healthcheck）
docker compose logs -f postgres
docker compose down           # 停止，保留数据
docker compose down -v        # 停止并删除数据卷（危险）
```

| 服务 | 镜像 | 宿主端口 | 说明 |
| --- | --- | --- | --- |
| postgres | `pgvector/pgvector:pg17` | 54732 | 关系库 + pgvector 扩展；认证状态表也在此库 |
| redis | `redis:7-alpine` | 46379 | 限流共享存储 / 业务缓存 |

**可观测性（可选）**：`docker compose --profile observability up -d` 额外起 Loki（47110）、Grafana（47111）、Alloy（47112）、Tempo（47113 / OTLP 47114）。
默认 Grafana 账号 `admin` / `starter_grafana_2026`（`.env` 可改），开发导航页「本地凭据」会显示；
打开 `http://localhost:47111/d/starter-overview` 可看日志量、错误与告警日志。
应用日志写 `logs/`（`pino-roll` 按天/50m 轮转，保留 7 个），Alloy 采集后进 Loki；管理端 `/observability/logs` 可检索请求日志与 traceId 时间线，
`/observability/audit-logs` 查看关键写操作审计（PostgreSQL，append-only）。
Grafana 预置两条告警规则（错误日志过多、慢请求过多），通知渠道需按环境配置。
开启 `OTEL_ENABLED=true` 后链路 span 进 Tempo，Grafana 可看瀑布并跳到同 traceId 日志。
业务日志打印规范见 [`docs/guides/logging-conventions.md`](docs/guides/logging-conventions.md)。
详见 [`docs/guides/logging-and-tracing.md`](docs/guides/logging-and-tracing.md)。

**认证/授权**：NestJS 官方 `@nestjs/authentication` + `@nestjs/authorization`，状态存 PostgreSQL，无独立 IdP 容器。多平台共用一个 server 天然共享登录态。当前骨架：JWT bearer + `@Public()` 豁免探活 + `@Can()` policy 示例；生产按官网补齐 store / Google OIDC / 2FA / 微信（详见 `.opencode/skills/standards/nestjs/SKILL.md` 与 `.env.example` 的注释）。

> 改了 `.env`（尤其 JWT_SECRET）必须重启服务——env 在进程启动时读取，nest watch 只监听 TS 文件。

应用连库：本地进程用 `localhost` + 上表端口（见 `.env` 的 `DATABASE_URL` / `REDIS_URL`）；容器化部署时用 service 名 `postgres` / `redis`。向量检索走 pgvector，访问封装成 `VectorStore` 接口，将来可换 Qdrant。

## 命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装全部依赖 |
| `pnpm dev` | 一键启动 server + client + admin + portal + Penpot MCP，并自动打开开发导航页 |
| `start-dev.cmd` | **双击启动**：检查环境 → `docker compose up -d` → 等 PostgreSQL → `pnpm dev`（Windows） |
| `stop-dev.cmd` | **双击停止**：结束应用进程 + `docker compose down`（保留数据卷） |
| `pnpm build` | 构建 + 全量 typecheck（qa 判定基线） |
| `pnpm schema:check` | 校验 Prisma 模型字段约定（id / 时间戳 / timestamptz） |
| `pnpm lint` | oxlint 检查 `apps` 与 `packages`（qa 判定基线） |
| `pnpm dev:client` | 启动客户端（47173） |
| `pnpm dev:admin` | 启动管理端（47174） |
| `pnpm dev:portal` | 启动门户（47175） |
| `pnpm dev:server` | 启动后端（47100） |

接口：`GET /api/health`（公开探活，工作台与客户端都用这个）。

## CI

模板自带 `.github/workflows/ci.yml`，生成项目后可直接用：

1. `pnpm install --frozen-lockfile`
2. 起 PostgreSQL（pgvector）与 Redis，执行 `docker/init-db.sql` 创建 `app_rw`
3. `prisma generate` → `db:deploy` → `db:seed`
4. `pnpm api:generate` → `pnpm build` → `pnpm lint`
5. 启动 server，依次跑 `test:e2e` / `tenants` / `rls` / `generated` / `logs` / `audit` / `traces`

Loki / Tempo 不可达时 `test:logs` / `test:traces` 自动 SKIP；失败会上传 server 日志。

## 生产部署（Docker）

```bash
cp .env.production.example .env.prod   # 改数据库/Redis 密码、JWT_SECRET、APP_URL
# 首次部署：SEED_ON_START=true，并设置 SEED_USER_PASSWORD
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

- server 多阶段镜像：生产依赖 + 非 root（`app`）+ `HEALTHCHECK`
- 容器启动时自动执行 `prisma migrate deploy`；`SEED_ON_START=true` 时执行幂等 seed
- PostgreSQL / Redis 不暴露宿主端口，只暴露 `SERVER_PORT`
- `app_rw` 密码在 `docker/init-db.sql` 中固定，生产必须同步修改 SQL 与 compose 的 `DATABASE_URL`
- 前端（admin / client / portal）镜像与反向代理见下一阶段

## 双击启动 / 停止（Windows）

直接双击根目录的 `start-dev.cmd` / `stop-dev.cmd`：

- **启动**：检查 pnpm / Docker → 缺 `.env` 时自动从 `.env.example` 复制 → `docker compose up -d` → 等 PostgreSQL 就绪 → `pnpm dev`；服务日志留在窗口里，关闭窗口或 `Ctrl+C` 停止
- **停止**：释放 47100 / 47173–47175 / 4400–4403 → 清理项目目录下残留 node 监视进程 → `docker compose down`（**保留数据卷**）
- **只检查环境**：`pwsh -NoProfile -File scripts\start.ps1 -CheckOnly`
- Docker 未启动时启动脚本会直接提示，并停在窗口里等你看清楚

## 开发导航页

`pnpm dev` 同时启动 server / client / admin / portal 和 Penpot MCP，server 就绪后自动打开
`http://localhost:47100/api/dev`：

- 各应用端口、在线状态、打开链接
- server 的 health / Swagger / OpenAPI JSON 入口
- Penpot MCP（工具分组）：4401 状态、插件 manifest 链接
- PostgreSQL / Redis / Penpot / Mailpit 状态
- 未启动的服务显示启动命令，点击可复制

页面每 5 秒自动检测。只探测端口与在线状态，不返回连接串等敏感信息；仅开发环境注册，生产访问 404。
单独启动某一端仍可用 `pnpm dev:server` / `pnpm dev:admin` 等命令。

## 端口

统一使用 47xxx 段，不用框架默认端口。Vite 开了 `strictPort`，被占时直接失败而不是静默换端口。

## 接口层

```ts
import { configureApiClient } from "@starter/api/config";

const api = configureApiClient({
  getToken: () => authStore.getAccessToken(),
  onUnauthorized: () => authStore.clear(),
});

const health = await api.health();
```

路由常量在 `packages/shared` 的 `API_ROUTES`，前后端共用，不各写一份。

## 同步 agent

仓库 `agents/` 改动后（注意 `-ConfigDir` 指向本项目的 `.opencode`）：

```powershell
pwsh -NoProfile -File ..\..\scripts\sync.ps1 -ConfigDir .opencode
```

在 OpenCode 里 `/reload`。模板里的 `.opencode/agents/` 是仓库 agents 的快照，别手改，改了会被覆盖。

## 产物

```text
docs/deliverables/<slug>/
├── 01-prd.md
├── 01-wireframe.md       ← 页面上显示什么（Markdown 结构 + Mermaid）
├── 01-interaction.md     ← 页面怎么联动（交互编号 + Mermaid 状态机）
├── 02-tech-design.md     ← 必须含逐条可行性结论
├── 03-dev-log.md
├── 04-code-review.md     ← 必须审查通过才能进测试
├── 05-test-plan.md
├── 05-test-report.md
└── 06-record.md
```
