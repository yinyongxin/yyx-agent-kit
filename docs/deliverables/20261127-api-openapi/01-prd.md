# 前后端接口联动：Swagger + Hey API — PRD

## 1. 背景

后端已有 REST 接口，但前端 `@starter/api` 是手写客户端，接口路径、请求/响应类型靠人肉同步，容易与 Controller 漂移。

## 2. 目标

以后端 NestJS Swagger 产出的 OpenAPI 规范为**唯一契约源**，用 `@hey-api/openapi-ts` 生成前端 TypeScript 客户端与类型，实现「后端改接口 → 重新生成 → 前端编译期发现不兼容」。

## 3. 范围

### 做

- 后端接入 `@nestjs/swagger`，暴露 Swagger UI 与 OpenAPI JSON
- 为现有 Controller / DTO 补最小必要装饰器（标签、操作、Bearer 认证、字段说明）
- 提供离线导出脚本：不启动端口，直接把 OpenAPI JSON 写到 `packages/api/openapi.json`
- `packages/api` 接入 `@hey-api/openapi-ts`，生成到 `src/generated`
- 根脚本 `api:generate` 串联「导出规范 → 生成客户端」
- 生成物禁止手改、不提交；消费方式写进 README

### 不做

- 不替换现有手写 `client.ts`（健康检查等轻量调用继续可用）
- 不做 API 文档站点美化 / 权限控制
- 不迁移所有前端页面到生成客户端（先打通链路并给示例）

## 4. 验收标准

| 编号 | 验收 |
| --- | --- |
| AC1 | 启动后 `GET /api/docs` 返回 Swagger UI，`GET /api/docs-json` 返回合法 OpenAPI 3 |
| AC2 | `pnpm api:generate` 在无运行中服务时也能完成（离线导出 + 生成） |
| AC3 | `packages/api/src/generated` 生成类型与函数，`pnpm --filter @starter/api typecheck` 通过 |
| AC4 | 生成的客户端可完成 `sign-in` / `me/tenants` 调用（示例或 e2e 证明） |
| AC5 | 生成物被 gitignore，README 明确「禁止手改」与重新生成命令 |
| AC6 | 全量 `pnpm build` / `pnpm lint` 通过 |
