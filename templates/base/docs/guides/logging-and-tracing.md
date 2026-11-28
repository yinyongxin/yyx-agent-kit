# 日志与链路追踪

> 2026-11-28 落地。实现见 `apps/server/src/logging/`，本文记录选型与边界。

## 1. 选型

| 能力 | 方案 | 原因 |
| --- | --- | --- |
| 日志引擎 | **pino + nestjs-pino** | 社区主流（pino 周下载 78M、nestjs-pino 4.6M）；NodeAdapter 已实测兼容 |
| 请求上下文 | 自建 `RequestContext` ALS | traceId 贯穿全链路，业务不用传参 |
| 日志存储 | **stdout JSON** → Alloy → Loki（P2） | 请求日志不进业务库，避免 276GB/天级膨胀 |
| 审计日志 | PostgreSQL `audit_logs`（后续） | 关键写操作长期保留 |
| 链路追踪 | W3C `traceparent`；OTel 后续 | 先保证 traceId 串联，再上 span 瀑布 |

为什么不用内置 ConsoleLogger：Nest 12 已支持 JSON/结构化/脱敏，但缺请求自动日志、ALS 绑定、传输；
pino + nestjs-pino 已在这些点成熟，且 NodeAdapter 实测通过（健康检查、404/401/500、userId、耗时、堆栈均正常）。

## 2. 存储

- **应用/请求日志**：pino JSON 写 stdout；开发直接看终端，生产由 Docker / PM2 / Grafana Alloy 收集
- **审计日志**：PostgreSQL 独立表（actor / tenant / action / target / before / after / traceId / ip）
- **慢 SQL**：Prisma `$on("query")`，只记 >100ms（待接入）
- **不要**：把完整请求日志写进业务库；Loki label 不要放 traceId（高基数，放日志行/structured metadata）

## 3. traceId

- 入站 `traceparent` 合法则复用 trace-id；否则生成 32 位 hex
- 每个请求新建 16 位 span-id
- **所有响应**（成功/失败）返回：
  - `X-Trace-Id: <32 hex>`
  - `traceparent: 00-<traceId>-<spanId>-01`
- 错误响应体额外带 `traceId`
- 成功响应体不改，避免 OpenAPI 契约变更
- 跨域时在 CORS 配置里 `exposedHeaders: ["X-Trace-Id", "traceparent"]`
- 公网入口应校验/必要时重启 traceparent，不能无条件信任客户端

## 4. 日志内容

每个请求一条 completion log（`/api/dev` 与 SSE 除外）：

```json
{
  "level": 30,
  "time": "2026-11-28T04:06:37.570Z",
  "traceId": "492c...",
  "requestId": "1eec...",
  "userId": "...",
  "tenantId": "...",
  "req": { "id": "...", "method": "GET", "url": "/api/me/tenants", "headers": { "authorization": "***" } },
  "res": { "statusCode": 200 },
  "responseTime": 11,
  "reqBody": null,
  "resBody": [{ "id": "...", "slug": "default" }],
  "msg": "request completed"
}
```

约束：

- 请求/响应体 **脱敏**（password/token/authorization/cookie/apiKey…）
- 单条 body 超过 `LOG_BODY_LIMIT`（默认 16KB）只保留预览
- multipart / SSE / 开发导航页不记录 body
- 4xx → `warn`，5xx/异常 → `error`（带堆栈）
- 生产默认 `LOG_HTTP_BODY=false`（性能与隐私），需要排查时临时打开

## 5. 日志页面（P1）

- 管理端 `日志` 页：DataTable 服务端模式
- 筛选：时间、级别、状态码、方法、路径、userId、tenantId、traceId
- 详情抽屉：请求头（脱敏）、请求体、响应体、错误堆栈、同 traceId 时间线
- 后端查询 Loki/审计表，不直接读文件；平台管理员权限

## 6. 性能

- pino overhead 低；成本主要来自 body 序列化与日志量
- 成功请求 body 日志生产默认关闭；错误/慢请求可 100%
- Loki 查询限制时间范围，按 label（service/env/level）过滤
- OTel 若接入：关闭 `@opentelemetry/instrumentation-nestjs-core`（不支持 Nest 12），只保留 HTTP/pg 等基础插桩

## 7. 验证基线

`apps/server/test/tenants-e2e.mjs` 等继续跑；新增日志相关验收建议：

- `/api/health` 响应头有 `X-Trace-Id` / `traceparent`
- 入站 `traceparent` 被复用
- 登录请求日志中 `password` / `accessToken` 为 `[REDACTED]`
- 401/500 响应体带 `traceId`，日志级别 warn/error
