# api

## 职责

接口层唯一入口：请求类型、SDK、错误处理都在这里收敛。各端业务代码**不得**自己写 fetch 或拼 URL。

路由路径来自 `@starter/shared` 的 `API_ROUTES`，本包不自己写字符串。

`package.json` 的 `exports` 是白名单，新增子路径必须同时改 `exports`。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `config.ts` | 手写：装配客户端（token 注入、401 回调、baseUrl） |
| `src/client.ts` | 请求封装，支持注入 `fetcher` 适配非 Web 端 |
| `src/types.ts` | 传输层类型（Result 包装、健康检查、租户摘要） |
| `src/index.ts` | 包入口（手写 client） |
| `src/openapi-client.ts` | OpenAPI 生成客户端的聚合入口（`@starter/api/generated`） |
| `src/generated/` | heyapi 生成物，**禁止手改**、不提交 |
| `openapi-ts.config.ts` | heyapi 生成配置（输入 `openapi.json`） |
| `openapi.json` | 后端导出的 OpenAPI 契约，提交入库便于 diff |
| `src/README.md` | 本文件 |

## 注意事项

- `baseUrl` 默认 `/api`，开发期由 Vite 代理到后端；**不要写死后端域名**。
- 401 只负责通知调用方，清会话和跳登录由各端自己实现，传输层不感知路由。
- **接口联动**：后端改接口后运行 `pnpm api:generate`（= 构建 server → 导出 `openapi.json` → 生成 `src/generated`），生成物禁止手改；`src/generated` 不提交，`openapi.json` 提交。业务优先从 `@starter/api/generated` 导入生成函数与类型。
- **首次 clone 后**先跑一次 `pnpm api:generate`，否则 `@starter/api/generated` 不存在、typecheck 会报模块缺失。
- 手写 `client.ts` 保留给健康检查等轻量调用；生成客户端与手写 client 不混用同一导出名。
- 小程序 / App 端没有标准 `fetch`，通过 `fetcher` 注入各自的请求器，不要改 `client.ts` 里写死实现。
- 租户前缀由 API client 自动拼：single 模式用 `DEFAULT_TENANT_ID`，multi 模式用 `configureApiClient({ getTenantId })`；业务代码写相对路径（如 `/users`），不要自己拼 `/t/:tenantId`。`health` / `me` 无租户上下文，不加前缀。
