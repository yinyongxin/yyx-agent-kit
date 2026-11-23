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
├── 02-tech-design.md     ← 必须含逐条可行性结论
├── 03-dev-log.md
├── 04-test-plan.md
├── 04-test-report.md
└── 05-record.md
```
