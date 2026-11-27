# 开发导航页 — 测试报告

## 环境

- Windows + PowerShell 7，Node（mise 管理）
- server `localhost:47100`（开发模式）、生产模式临时用 47101 验证
- 依赖容器：`starter-postgres`、`starter-redis`、Penpot、Mailpit 运行中

## 验收对照

| 编号 | 验收点 | 结果 | 证据 |
| --- | --- | --- | --- |
| AC1 | `pnpm dev` 一键启动 + 自动打开 | 通过 | 脚本 `node --check` 通过；`DEV_NO_OPEN=1 node scripts/open-dev.mjs` 正确探测并打印地址；`concurrently --kill-others-on-fail` 配置在根 `package.json` |
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
