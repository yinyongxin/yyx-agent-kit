# 前后端接口联动：Swagger + Hey API — 技术方案

## 1. 版本与依赖

| 包 | 版本 | 位置 |
| --- | --- | --- |
| `@nestjs/swagger` | 12.1.3 | server dependencies |
| `@hey-api/openapi-ts` | 0.99.0 | api devDependencies（精确锁版本） |
| `@hey-api/client-fetch` | 0.13.1 | api dependencies（生成代码运行时依赖） |

## 2. 契约流水线

```
NestJS Controller/DTO
  → SwaggerModule.createDocument()
  → packages/api/openapi.json（离线导出，提交入库便于 diff）
  → @hey-api/openapi-ts
  → packages/api/src/generated（生成物，gitignore）
  → 各前端 import
```

为什么先导出 JSON 再生成：

- 生成不依赖后端端口运行，CI 与本地都可重复
- `openapi.json` 入库，接口变更在 code review 里可见
- heyapi 支持直接吃 URL，但那要求服务先启动，易在 CI 里失败

## 3. 后端改动

| 文件 | 改动 |
| --- | --- |
| `src/main.ts` | `DocumentBuilder`（标题/版本/Bearer）+ `SwaggerModule.setup`，暴露 `/api/docs` 与 `/api/docs-json` |
| `src/swagger.ts`（新增） | 抽出 `buildOpenApiDocument(app)`，main 与导出脚本共用，避免两处漂移 |
| `scripts/export-openapi.ts`（新增） | 创建 Nest 应用（不 listen）→ 生成文档 → 写 `../../packages/api/openapi.json` |
| 各 controller | `@ApiTags` / `@ApiOperation` / `@ApiBearerAuth`，DTO 字段加 `@ApiProperty` |
| `package.json` | `swagger:export` 脚本 |

## 4. 前端改动

| 文件 | 改动 |
| --- | --- |
| `packages/api/openapi-ts.config.ts`（新增） | `input: ./openapi.json`，`output: src/generated`，插件 `@hey-api/client-fetch` |
| `packages/api/package.json` | 依赖 + `openapi-ts` 脚本 |
| `packages/api/src/openapi-client.ts` | 生成物聚合入口（`export * from "./generated"` + `client`），通过 `@starter/api/generated` 导出 |
| `packages/api/src/README.md` | 生成命令、禁止手改、与手写 client 的分工 |
| 根 `package.json` | `api:generate` 串联导出与生成 |

## 5. 消费约定

- 业务接口：优先用生成函数（`signIn`、`getMeTenants` 等），请求/响应类型来自 OpenAPI
- 生成客户端的基础地址沿用现有约定：开发期走 `/api`，由 Vite/Next 代理；不写死后端域名
- 认证头通过生成客户端的 `auth`/`headers` 配置注入 Bearer token
- 改接口的顺序：改 Controller/DTO → `pnpm api:generate` → 前端编译期暴露不兼容

## 6. 风险

- `@hey-api/openapi-ts` 处于 0.x，锁精确版本，升级需看迁移说明
- Swagger 装饰器是增量补，遗漏的字段会变成 `unknown`，但不影响现有手写调用
- 生成物与手写 `client.ts` 并存期间，避免同名导出冲突（generated 走独立入口）
