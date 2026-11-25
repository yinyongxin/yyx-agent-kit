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
├── client/     客户端   React 19 + Vite 6 + TS + Tailwind 4   47173
├── admin/      管理端   React 19 + Vite 6 + TS + Tailwind 4   47174
├── portal/     门户     Next.js 16 App Router + Tailwind 4     47175
└── server/     后端     NestJS 11                              47100，路由前缀 /api
packages/
├── shared/     常量、路由表、业务枚举、类型（TS 源码直供）
└── api/        接口层：类型、SDK、错误处理
docs/           需求交付物，按 docs/<slug>/ 存放
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

**认证/授权**：NestJS 官方 `@nestjs/authentication` + `@nestjs/authorization`，状态存 PostgreSQL，无独立 IdP 容器。多平台共用一个 server 天然共享登录态。当前骨架：JWT bearer + `@Public()` 豁免探活 + `@Can()` policy 示例；生产按官网补齐 store / Google OIDC / 2FA / 微信（详见 `skills/standards/nestjs/SKILL.md` 和 `docs/credentials.md`）。

> 改了 `.env`（尤其 JWT_SECRET）必须重启服务——env 在进程启动时读取，nest watch 只监听 TS 文件。

应用连库：本地进程用 `localhost` + 上表端口（见 `.env` 的 `DATABASE_URL` / `REDIS_URL`）；容器化部署时用 service 名 `postgres` / `redis`。向量检索走 pgvector，访问封装成 `VectorStore` 接口，将来可换 Qdrant。

## 命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装全部依赖 |
| `pnpm build` | 构建 + 全量 typecheck（qa 判定基线） |
| `pnpm lint` | oxlint 检查 `apps` 与 `packages`（qa 判定基线） |
| `pnpm dev:client` | 启动客户端（47173） |
| `pnpm dev:admin` | 启动管理端（47174） |
| `pnpm dev:portal` | 启动门户（47175） |
| `pnpm dev:server` | 启动后端（47100） |

接口：`GET /api/health`（运维探活）、`GET /api/todos`（业务示例）。

## 端口

统一使用 47xxx 段，不用框架默认端口。Vite 开了 `strictPort`，被占时直接失败而不是静默换端口。

## 接口层

```ts
import { configureApiClient } from "@starter/api/config";

const api = configureApiClient({
  getToken: () => authStore.getAccessToken(),
  onUnauthorized: () => authStore.clear(),
});

const todos = await api.todos();
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
docs/<slug>/
├── 01-prd.md
├── 01-wireframe.md       ← 页面上显示什么（Markdown 结构 + Mermaid）
├── 01-interaction.md     ← 页面怎么联动（交互编号 + Mermaid 状态机）
├── 02-tech-design.md     ← 必须含逐条可行性结论
├── 03-dev-log.md
├── 04-test-plan.md
├── 04-test-report.md
└── 05-record.md
```
