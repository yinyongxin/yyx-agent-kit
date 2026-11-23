# api

## 职责

接口层唯一入口：请求类型、SDK、错误处理都在这里收敛。各端业务代码**不得**自己写 fetch 或拼 URL。

路由路径来自 `@agent-test/shared` 的 `API_ROUTES`，本包不自己写字符串。

`package.json` 的 `exports` 是白名单，新增子路径必须同时改 `exports`。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `config.ts` | 手写：装配客户端（token 注入、401 回调、baseUrl） |
| `src/client.ts` | 请求封装，支持注入 `fetcher` 适配非 Web 端 |
| `src/types.ts` | 传输层类型（Result 包装、健康检查） |
| `src/index.ts` | 包入口 |
| `src/README.md` | 本文件 |

## 注意事项

- `baseUrl` 默认 `/api`，开发期由 Vite 代理到后端；**不要写死后端域名**。
- 401 只负责通知调用方，清会话和跳登录由各端自己实现，传输层不感知路由。
- 当前是手写实现。接入 OpenAPI 生成后，生成物放 `src/`（整个目录会被重建），手写装配留在 `config.ts`，不要混进 `src/`。
- 小程序 / App 端没有标准 `fetch`，通过 `fetcher` 注入各自的请求器，不要改 `client.ts` 里写死实现。
