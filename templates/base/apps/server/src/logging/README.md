# logging — 请求日志、traceId 与异常输出

## 职责

- 为每个 HTTP 请求生成/透传 **W3C traceId**，并写入请求上下文（AsyncLocalStorage）
- 统一 JSON 日志（pino + nestjs-pino）：请求路径、状态码、耗时、userId/tenantId、请求/响应体
- 响应头统一返回 `X-Trace-Id` / `traceparent`（成功与失败都带）
- 全局异常过滤器：错误响应体带 `traceId`，500 不泄露内部异常信息

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `request-context.ts` | 请求级 ALS：`traceId / spanId / requestId` |
| `trace.middleware.ts` | 解析/生成 traceparent，设置响应头，运行 RequestContext |
| `logging.module.ts` | 注册 `LoggerModule.forRootAsync`、全局拦截器、异常过滤器、trace middleware |
| `logging.interceptor.ts` | 把请求体/响应体脱敏截断后挂到 req，合并进 pino completion log |
| `sanitize.ts` | 递归脱敏（password/token/cookie 等）与大小截断 |
| `http-exception.filter.ts` | 统一错误响应并注入 `traceId` |

## 行为

- 每个请求 **一条 completion log**：`req`（method/url/headers）、`res.statusCode`、`responseTime`、
  `traceId`、`requestId`、`userId`、`tenantId`、`reqBody`、`resBody`
- 4xx → `warn`，5xx / 异常 → `error`（`LoggerErrorInterceptor` 在 `main.ts` 注册，带堆栈）
- `/api/dev` 的轮询不写 completion log（避免导航页刷屏）
- multipart、SSE、`/api/dev` 不记录 body
- `LOG_HTTP_BODY=false` 可关闭 body 日志；`LOG_BODY_LIMIT` 控制单条上限

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `LOG_LEVEL` | 开发 `debug` / 生产 `info` | pino 级别 |
| `LOG_HTTP_BODY` | 开发 `true` / 生产 `false` | 是否记录请求/响应体 |
| `LOG_BODY_LIMIT` | `16384` | body 日志字符上限 |

## 注意

- `LoggerModule` 只在本模块注册一次，业务模块不要重复 import
- traceId 只放响应头/错误体，**不要**放进成功响应 body（避免契约变更）
- 日志写 stdout，生产由 Docker / PM2 / Grafana Alloy 收集；不直接写业务库
- 新增敏感字段时同步 `sanitize.ts` 的关键字列表
