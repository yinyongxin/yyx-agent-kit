# HTTP Adapter 迁移：Express → NodeAdapter — 开发日志

## 决策依据

- NestJS 12.3 起官方推荐 `NodeAdapter`（v13 起为默认）；当前项目是 12.6，属于「可 opt-in」阶段
- 当前牵连内容少（只有 `main.ts` 一行 + middleware 类型），早迁比 v13 被动升级成本低
- 官方基准：Nest on NodeAdapter 比 Nest on Express 高约 50% 吞吐；但对数据库密集型路由，实测差距只有 1~5%——**性能不是主因，避免未来被动迁移才是**

## Express-style helpers 影响评估

官方文档明确：NodeAdapter 的 `NodeRequest` / `NodeResponse` 继承 Node 原生对象，带 Express 风格 helpers；middleware 仍在 Express-style stack 中以 `(req, res, next)` 签名运行，helmet / compression / passport 等 Express middleware 照常工作。

对照本项目实际用法：

| 用法 | 结论 |
| --- | --- |
| `req.headers.authorization` | ✅ Node 原生 |
| `req.path` | ✅ 官方说明是 router 匹配后的 decoded path，middleware 与路由看到的一致 |
| `req.params.tenantId` | ⚠️ 类型上存在（typecheck 通过），运行时是否填充未验证；`TenantMiddleware` 有 `req.path` 正则兜底 |
| `MiddlewareConsumer` / `forRoutes("{*splat}")` | ✅ Nest 层 API，Express-style stack |
| `setGlobalPrefix` / guard / interceptor | ✅ Nest 核心能力，不受 adapter 影响 |

已知差异（本项目未用到）：路由按 specificity 而非注册顺序匹配、路径大小写敏感、无 ETag、参数上限 100 字符（UUID 36 字符安全）、部分 Express API 不可用（`res.render` / `req.accepts` 等）。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `apps/server/package.json` | 新增 `@nestjs/platform-node@^12.6.0`（`@nestjs/platform-express` 暂留，确认无间接依赖后再删） |
| `pnpm-lock.yaml` | `pnpm install --no-frozen-lockfile` 更新 |
| `src/main.ts` | `NestFactory.create<NestNodeApplication>(AppModule, new NodeAdapter())` |
| `src/auth/tenant.middleware.ts` | 类型由 `express` 的 `Request/Response/NextFunction` 改为 `@nestjs/platform-node` 的 `NodeRequest/NodeResponse`，并修正 `resolveTenantId` 参数类型 |

## 验证

- `pnpm --filter @starter/server typecheck`：通过
- `pnpm lint`：无 error（仅既有 Fast refresh 警告）
- grep 确认 `src/` 下无 `from "express"` 残留

## 遗留（部分已验证）

- ~~health 端点与 guard 行为需在有数据库的环境补测~~ **已验证**：health 200、启动无授权告警、e2e 覆盖 401 / 登录 / 租户端点，见 `07-auth-login.md`
- `req.params.tenantId` 在 middleware 阶段是否填充仍未单独断言：membership 成功说明解析链路可用，但无法区分走 params 还是 `req.path` 正则兜底
- `forRoutes("{*splat}")` 在 NodeAdapter 下的通配匹配行为仍待覆盖（现有 e2e 只走具体路径）
- 未来加 e2e 测试时，`createNestApplication(new NodeAdapter())`，否则测试会用 Express adapter
