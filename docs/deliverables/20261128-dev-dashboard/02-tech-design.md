# 开发导航页 — 技术设计

## 1. 方案对比

| 方案 | 形态 | 结论 |
| --- | --- | --- |
| A. server `/dev` 页 + 探测接口 | Nest 内联 HTML + JSON | **采用**：同源无 CORS、能探数据库、不用额外起服务 |
| B. admin 加「服务状态」页 | 复用 Mantine | 否决：要先登录；admin 自己没起就看不到 |
| C. 独立静态 HTML | file:// 或静态服务 | 否决：跨端口 CORS，还要多起一个服务 |
| D. 独立 Vite SPA | `apps/dev-dashboard` | 否决：多一个应用，仍要解决 CORS |
| E. Terminus 聚合健康检查 | 标准 `/health` | 暂缓：当前只需要人看，不需要给 K8s/监控消费 |
| F. 第三方 dashboard | Portainer / Homarr / Uptime Kuma | 否决：覆盖不到 Vite / Next dev server |
| G. 终端 TUI | `pnpm dev:status` | 否决：需求明确要浏览器 |

启动编排采用 **`concurrently` 一键启动**（K），状态展示采用 A。

## 2. 架构

```text
pnpm dev  (concurrently)
├── dev:server  ──> GET /api/dev  (HTML)
├── dev:client        GET /api/dev/services (JSON)
├── dev:admin               │
├── dev:portal              └─ DevService 并发探测
└── open-dev.mjs ──> 轮询 /api/dev 就绪后打开浏览器
                        ├── server      当前进程
                        ├── client/admin/portal   HTTP
                        ├── PostgreSQL   SELECT 1
                        └── Redis        TCP
```

前端页面与探测接口同源（`localhost:47100`），浏览器不直接请求 47173/47174，避免 CORS。

## 3. 探测策略

| 目标 | 方式 | 超时 |
| --- | --- | --- |
| server | 进程自身 | - |
| 各前端 / Penpot / Mailpit | `fetch`，拿到任意响应即在线 | 1200ms |
| PostgreSQL | Prisma `SELECT 1` | 1200ms（Race 兜底） |
| Redis | `net.createConnection` TCP | 1200ms |

所有探测 `Promise.all` 并发执行，最坏 1.2s 返回。

## 4. 端口推导

端口不写死，按约定从 server 端口推导：

```text
portBase = floor(PORT / 100) * 100    // 47100 -> 47100
client = portBase + 73
admin  = portBase + 74
portal = portBase + 75
```

依赖服务端口读 `POSTGRES_PORT` / `REDIS_PORT` / `PENPOT_PORT` / `PENPOT_MAILPIT_PORT`，默认值与 `.env.example` 一致。CLI `--port-base 48100` 生成的项目同样正确。

## 5. 安全边界

- `AppModule` 仅在 `NODE_ENV !== "production"` 时 import `DevModule`；controller 内再断言一次，生产 404
- 两个路由 `@Public()`（未登录可看），只暴露端口、URL、在线状态
- `@ApiExcludeController()`：不进入 `openapi.json`，不污染前端生成客户端
- 无写操作，不扫端口、不读进程列表，全部基于已知配置

## 6. 文件清单

| 文件 | 作用 |
| --- | --- |
| `apps/server/src/dev/dev.module.ts` | 条件注册的模块 |
| `apps/server/src/dev/dev.controller.ts` | `/api/dev` HTML、`/api/dev/services` JSON |
| `apps/server/src/dev/dev.service.ts` | 服务清单与探测 |
| `apps/server/src/dev/dev.page.ts` | 单文件 HTML（内联 CSS/JS，无构建） |
| `apps/server/src/config/configuration.ts` | 新增 `dev` 命名空间 |
| `packages/shared/src/index.ts` | `API_ROUTES.dev` / `devServices` |
| `scripts/open-dev.mjs` | 轮询就绪后打开浏览器（`DEV_NO_OPEN=1` 可关闭） |
| 根 `package.json` | `dev` 一键启动脚本 |

## 7. 关键决策

- **页面用原生 HTML 而不是 React**：避免为工具页引入一个前端应用与构建链；页面只做轮询 + 渲染卡片。
- **不引入 wait-on / open 依赖**：Node 内置 fetch + 平台命令足够，减少依赖。
- **不用 `--kill-others-on-fail`**：单个应用失败（端口被占等）不应连带杀掉其他应用；导航页本身就是用来暴露「哪个没起来」的。
- **`open-dev.mjs` 正常退出不触发清理**：它是第 5 个并发进程，成功探测后以 0 退出。
- **不改 OpenAPI 契约**：dev 路由与业务契约无关，显式排除。
