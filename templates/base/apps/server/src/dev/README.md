# dev — 本地开发导航页

## 职责

一个页面看全本地启动情况：KPI（应用 / 工具 / 依赖在线数、在线率、探测耗时）、各服务端口与状态、Swagger / health 入口，以及状态变化事件与启动命令。

只在**非生产环境**注册；生产访问 `/starter/api/dev` 直接 404。

## 入口

| 地址 | 内容 |
| --- | --- |
| `GET /starter/api/dev` | 导航页（原生 HTML，每 5 秒轮询） |
| `GET /starter/api/dev#overview` | 概览视图 |
| `GET /starter/api/dev#services` | 服务视图（分组筛选 + 每服务一行卡片） |
| `GET /starter/api/dev#tools` | 工具视图（命令 / MCP / 入口） |
| `GET /starter/api/dev/services` | 探测结果 JSON |

页面与接口都是 `@Public()`，未登录也能打开。

## 视觉与数据

- **Bento 概览 + 深色玻璃拟态**：KPI 大小 tile 混排，服务区每个服务一行卡片；半透明渐变 + `backdrop-filter`，背景为橙/紫/蓝径向光斑。
- **三个视图**在客户端切换（`#overview` / `#services` / `#tools`），轮询不中断：
  - 概览：在线率仪表盘、应用/工具/依赖/耗时 KPI、最近事件、服务行卡片、命令/端口/探测策略
  - 服务：KPI 条 + 分组筛选（全部/应用/工具/依赖）+ 每服务一行（名称、端口、入口、启动命令、本地凭据）
  - 工具：快捷命令、Penpot MCP（打开 Penpot）、端口约定、常用入口、探测策略、环境信息
- **无演示数据**：KPI、仪表盘、服务行全部由探测结果计算；事件由状态变化生成（首次加载记录“开始监控”）；探测耗时是浏览器侧 fetch 往返时间。
- 响应式：1180px 两列、760px 单列；服务行在窄屏自动换行，不横向滚动。

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
| client / admin / portal / Penpot / Mailpit / Penpot MCP | HTTP 请求，拿到任意响应即在线 |
| PostgreSQL | `SELECT 1`（Prisma，超时兜底） |
| Redis | TCP 连接 |

端口从配置推导，不写死：`client = server + 73`、`admin = +74`、`portal = +75`，依赖服务端口读 `POSTGRES_PORT` / `REDIS_PORT` / `PENPOT_*`，Penpot MCP 读 `PENPOT_MCP_PORT`（默认 4401）。CLI 用 `--port-base` 生成的项目也正确。

## 关联

- 一键启动（自动打开本页）：根目录 `pnpm dev`，见 `scripts/open-dev.mjs`
- 端口推导配置：`src/config/configuration.ts` 的 `devConfig`

## 同步要求

- 新增前端应用或依赖服务时，同时更新 `dev.service.ts` 的清单与 `devConfig` 端口。
- 本模块不得返回连接串、密码等敏感信息，只返回端口、URL、在线状态。
