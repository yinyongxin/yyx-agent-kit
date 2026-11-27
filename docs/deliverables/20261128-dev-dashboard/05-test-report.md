# 开发导航页 — 测试报告

## 环境

- Windows + PowerShell 7，Node（mise 管理）
- server `localhost:47100`（开发模式）、生产模式临时用 47101 验证
- 依赖容器：`starter-postgres`、`starter-redis`、Penpot、Mailpit 运行中

## 验收对照

| 编号 | 验收点 | 结果 | 证据 |
| --- | --- | --- | --- |
| AC1 | `pnpm dev` 一键启动 + 自动打开 | 通过 | 实际运行 `pnpm dev`：四端端口全部监听、导航页显示 4/4 应用在线；`DEV_NO_OPEN=1` 时只打印地址（`open-dev.mjs` 退出码 0） |
| AC2 | `GET /api/dev` 返回 HTML、免登录 | 通过 | 200，`text/html; charset=utf-8`，8381 字节 |
| AC3 | `GET /api/dev/services` 返回状态 | 通过 | 200，8 项：server/client/admin/portal/PostgreSQL/Redis/Penpot/Mailpit，字段含 port/status/url/links/command/probe |
| AC4 | 5 秒刷新、命令可复制 | 通过 | 浏览器实测自动更新时间变化；离线卡片渲染 `pnpm dev:client` 等按钮；console 无错误 |
| AC5 | 端口推导 | 通过 | 返回 47173/47174/47175；依赖端口为 54732/46379/9001/8025，与 `.env` 一致 |
| AC6 | 生产 404 | 通过 | `NODE_ENV=production PORT=47101` 下 `/api/dev` → 404，`/api/health` → 200 |
| AC7 | 契约不含 dev 路由 | 通过 | `pnpm swagger:export` 后 `openapi.json` 中 `/api/dev` 匹配 0 次 |
| AC8 | 探测不阻塞 | 通过 | 全部探测并发；单次 `/api/dev/services` 响应 < 1.5s |

## 回归

| 命令 | 结果 |
| --- | --- |
| `pnpm build` | 通过 |
| `pnpm lint` | 通过（仅既有 warning） |
| `pnpm --filter @starter/server test:e2e` | 全部通过 |
| `pnpm --filter @starter/server test:tenants` | 租户 CRUD 验收通过 |
| `pnpm --filter @starter/server test:rls` | S4 并发验证通过（0 串数据） |
| `pnpm --filter @starter/server test:generated` | 生成客户端联动通过 |

## 缺陷

无阻断缺陷。已修复两个体验问题：

1. 离线服务也显示「打开」按钮 → 改为仅在线显示
2. `dotenv` 注入日志干扰输出 → `quiet: true`

## 结论

验收标准全部通过，可以交付。

## 2026-11-28 深色玻璃版落地验证

`dev.page.ts` 按 Penpot `Dark Glass 1440` 画板重写后，用 ego-browser 在真实环境回归：

| 项 | 结果 |
| --- | --- |
| 全在线场景 | KPI `4/4 · 1/1 · 4/4 · 100% · 47–58ms`，仪表盘 `9/9`，表格 9 行 |
| 离线场景（手动停止 client） | KPI `3/4` + `1 离线`，在线率 `88.9%`，仪表盘 `8/9`，事件新增 `client 探测失败`（橙色点），表格该行 `离线` 且入口显示 `—` |
| 事件流 | 首次加载记录 `开始监控 · 9 个服务`；状态变化自动追加，最多保留 6 条 |
| 数据真实性 | 无演示数据：KPI/仪表盘/表格由探测结果计算，探测耗时为 fetch 往返时间 |
| 响应式 | 1180px / 760px 断点与 `backdrop-filter` 回退规则已加（CSS 层） |
| 截图 | `C:/Users/Administrator/AppData/Local/Temp/opencode/ego-devpage/dashboard-2.png`（全在线）、`dashboard-offline.png`（离线） |

## 2026-11-28 Bento + 三视图验证

| 项 | 结果 |
| --- | --- |
| 视图切换 | 概览 / 服务 / 工具 三个 tab 正常切换；hash 为 `#overview` / `#services` / `#tools`，深链打开对应视图 |
| 概览 | Bento 混排；仪表盘 `9/9`、KPI `4/4 · 1/1 · 4/4`、事件、应用列表、服务表、命令/端口/策略 |
| 服务 | 分组筛选：全部 9 行 → 点击「应用 4」变 4 行，激活态正确；表格含分组标签与启动命令 |
| 工具 | MCP 卡显示 4401，按钮「打开 Penpot」指向 `http://localhost:9001` |
| 轮询 | 切换视图不中断，仍每 5s 更新 |
| 截图 | `bento-overview.png` / `bento-services.png` / `bento-tools.png`（同目录） |
