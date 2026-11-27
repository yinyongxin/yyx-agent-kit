# dev — 本地开发导航页

## 职责

一个页面看全本地启动情况：各应用端口与在线状态、Swagger / health 入口、依赖服务（PostgreSQL / Redis / Penpot）状态，以及未启动时的启动命令。

只在**非生产环境**注册；生产访问 `/api/dev` 直接 404。

## 入口

| 地址 | 内容 |
| --- | --- |
| `GET /api/dev` | 导航页（原生 HTML，每 5 秒轮询） |
| `GET /api/dev/services` | 探测结果 JSON |

页面与接口都是 `@Public()`，未登录也能打开。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `dev.module.ts` | `DevModule`，由 `AppModule` 按 `NODE_ENV` 条件注册 |
| `dev.controller.ts` | 两个入口；`@ApiExcludeController()` 避免污染 OpenAPI 契约 |
| `dev.service.ts` | 服务清单 + 探测（HTTP / TCP / `SELECT 1`），1200ms 超时 |
| `dev.page.ts` | 单文件 HTML（内联 CSS/JS），不依赖构建与第三方库 |

## 探测方式

| 目标 | 方式 |
| --- | --- |
| server | 进程自身（能打开页面即在线） |
| client / admin / portal / Penpot / Mailpit | HTTP 请求，拿到任意响应即在线 |
| PostgreSQL | `SELECT 1`（Prisma，超时兜底） |
| Redis | TCP 连接 |

端口从配置推导，不写死：`client = server + 73`、`admin = +74`、`portal = +75`，依赖服务端口读 `POSTGRES_PORT` / `REDIS_PORT` / `PENPOT_*`。CLI 用 `--port-base` 生成的项目也正确。

## 关联

- 一键启动（自动打开本页）：根目录 `pnpm dev`，见 `scripts/open-dev.mjs`
- 端口推导配置：`src/config/configuration.ts` 的 `devConfig`

## 同步要求

- 新增前端应用或依赖服务时，同时更新 `dev.service.ts` 的清单与 `devConfig` 端口。
- 本模块不得返回连接串、密码等敏感信息，只返回端口、URL、在线状态。
