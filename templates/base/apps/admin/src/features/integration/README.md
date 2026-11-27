# integration — 接口联调页

## 职责

演示「后端 Swagger → OpenAPI → 前端生成客户端」的完整链路：登录拿 token、拉租户列表、查成员与角色。用于验证契约可用，不作为正式业务功能。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `IntegrationPage.tsx` | PageShell 包装 |
| `IntegrationContent.tsx` | 表单与调用逻辑（`@starter/api/generated`） |
| `index.ts` | 统一导出 |

## 关联

- 路由：`src/routes/integration.tsx`
- 生成客户端：`packages/api/src/generated`（`pnpm api:generate`）
- 契约：`packages/api/openapi.json`

## 同步要求

- 生成客户端的函数名由 controller/方法名派生，重命名后端 handler 后需重新 `pnpm api:generate` 并同步本页。
- 生成路径已含 `/api`，`baseUrl` 留空走 Vite 代理，不要重复拼 `/api`。
