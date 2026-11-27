# 开发导航页 — 开发日志

## 实施清单

1. 根目录安装 `concurrently`（`pnpm add -Dw`），新增 `pnpm dev`：
   - 并发启动 server / client / admin / portal
   - `--kill-others-on-fail`：某个应用启动失败时整体退出，避免半启动状态
2. 新增 `scripts/open-dev.mjs`：轮询 `/api/dev` 直到 200（最长 90s），再用平台命令打开默认浏览器；`DEV_NO_OPEN=1` 只打印不打开。
3. `packages/shared`：`API_ROUTES` 增加 `dev` / `devServices`。
4. `apps/server/src/config`：
   - 新增 `dev` 命名空间：由 `PORT` 推导 client/admin/portal 端口，读取依赖服务端口与 Redis host
   - `AppConfigModule` 的 `load` 注册 `devConfig`
5. 新增 `apps/server/src/dev/`：
   - `dev.service.ts`：应用 + 依赖服务清单，并发探测（HTTP / TCP / `SELECT 1`）
   - `dev.page.ts`：单文件 HTML，原生 CSS/JS，5 秒轮询、点击命令复制
   - `dev.controller.ts`：`/api/dev`、`/api/dev/services`，`@Public()` + `@ApiExcludeController()` + 生产断言
   - `dev.module.ts`、`README.md`
6. `app.module.ts`：按 `NODE_ENV` 条件注册 `DevModule`。
7. `main.ts`：启动后打印「开发导航页」地址。
8. 文档：`apps/server/README.md`、`apps/server/src/config/README.md`、模板 `README.md`、`AGENTS.md`、`docs/guides/conventions.md`、`skills/standards/workspace/SKILL.md`。

## 遇到的问题

| 问题 | 处理 |
| --- | --- |
| 接口 `DevService` 与 Service 类同名，TS 报缺属性 | 接口改名 `DevServiceInfo`，controller 与响应类型同步 |
| 后台启动 server 时退出码 1、无输出 | 用 `Start-Process` 重定向 stdout/stderr 定位；`main.ts` 的 `bootstrap().catch` 已保证启动异常会打印 |
| 离线卡片仍显示橙色「打开」按钮，容易误点 | 只在 `status === "online"` 时渲染入口链接 |
| `dotenv` v18 默认打印注入日志，干扰 `pnpm dev` 输出 | `config({ quiet: true })` |

## 验证记录

| 项 | 结果 |
| --- | --- |
| `pnpm build` / `pnpm lint` | 通过（lint 仅历史 warning） |
| `GET /api/dev` | 200，`text/html; charset=utf-8`，8381 字节 |
| `GET /api/dev/services` | 200，8 个服务；在线/离线状态与实际进程一致 |
| 生产模式（`NODE_ENV=production`，PORT=47101） | `/api/dev` 404，`/api/health` 200 |
| `pnpm swagger:export` | 契约中 `/api/dev` 出现 0 次 |
| `node scripts/open-dev.mjs`（`DEV_NO_OPEN=1`） | 打印导航页地址并以 0 退出 |
| `test:e2e` / `test:tenants` / `test:rls` / `test:generated` | 全部通过 |
| 浏览器实测 | 页面渲染正常，无 console 错误；离线卡片显示可复制命令 |
