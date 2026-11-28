# 日志与链路追踪

> 2026-11-28 落地 P0（pino + traceId）、P1（Loki + Alloy + Grafana + 管理端日志页）、P2（OTel + Tempo 链路追踪）。
> 实现见 `apps/server/src/logging/`（写入）、`apps/server/src/logs/`（查询）、`apps/server/src/tracing.ts`（OTel）与 `apps/admin/src/features/observability/logs/`。

## 1. 选型

| 能力 | 方案 | 原因 |
| --- | --- | --- |
| 日志引擎 | **pino + nestjs-pino** | 社区主流（pino 周下载 78M、nestjs-pino 4.6M）；NodeAdapter 已实测兼容 |
| 请求上下文 | 自建 `RequestContext` ALS | traceId 贯穿全链路，业务不用传参 |
| 日志存储 | **stdout JSON + `logs/app.log` → Alloy → Loki** | 请求日志不进业务库，避免 276GB/天级膨胀 |
| 审计日志 | PostgreSQL `audit_logs`（后续需求） | 关键写操作长期保留 |
| 链路追踪 | **OTel + Tempo** | traceId 串联 + span 瀑布；NodeAdapter 下自定义 server span |

为什么不用内置 ConsoleLogger：Nest 12 已支持 JSON / 结构化 / 脱敏，但缺请求自动日志、ALS 绑定与传输；
pino + nestjs-pino 在这些点成熟，NodeAdapter 实测通过（健康检查、404/401/500、userId、耗时、堆栈均正常）。

## 2. 架构

```text
请求 ──► TraceMiddleware ──► LoggingInterceptor ──► Controller
            │  生成/透传 traceId         │  请求体/响应体脱敏截断后挂 req
            │  响应头 X-Trace-Id        │
            ▼                          ▼
      RequestContext(ALS)        pino completion log（一条/请求）
                                       │
                       stdout ─────────┴───────── logs/app.log
                                                       │
                                                    Alloy（解析 JSON、提 label / metadata）
                                                       │
                                                     Loki
                                                       │
                                   ┌───────────────────┴───────────────────┐
                             Grafana Explore / Dashboard           管理端「日志」页
                                                                  GET /api/logs

请求 ──► TraceMiddleware（OTel server span）──► pg / 出站 HTTP 子 span
                    │
              OTLP HTTP ──► Tempo ──► Grafana（span 瀑布，可跳同 traceId 的 Loki 日志）
```

- **应用/请求日志**：pino JSON 写 stdout；开发同时写 `logs/app.log` 供本地 Alloy 采集
- **审计日志**：PostgreSQL 独立表（后续），不混入请求日志
- **慢查询**：`scoped` extension 计时（`SLOW_SQL_MS`，默认 100ms）+ 租户事务整体耗时；日志 `msg: "slow query" / "slow transaction"`
- **不要**：把完整请求日志写进业务库；Loki label 不要放 traceId（高基数）

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

### OTel span（Tempo）

- `src/tracing.ts` 由 `main.ts` 第一行 import，初始化 `@opentelemetry/sdk-node`；未配置 `OTEL_ENABLED` / endpoint 时完全不加载 SDK
- 入站 server span 由 `TraceMiddleware` 自己创建（`SpanKind.SERVER`），名称 `GET /api/health`，属性 `http.request.method` / `url.path` / `http.response.status_code`
- **为什么不用 HTTP 插桩的入站 span**：Nest NodeAdapter 在请求 emit 之后异步调度，middleware 里拿不到插桩创建的 active span（实测 `none`），traceId 会与 Tempo 对不上；因此关闭入站插桩，自己 `startSpan` + `context.with` 包裹请求链
- 出站 HTTP client span 与 pg 查询 span 仍然自动生成（`pg.query:SELECT`、`pg-pool.connect`），是 server span 的子 span
- 导出：OTLP HTTP → Tempo（默认 `http://localhost:47114`）
- 日志 `traceId` 与 Tempo `traceId` 一致，可在 Grafana 从 span 跳到同 trace 的 Loki 日志
- 关闭的插桩：`instrumentation-nestjs-core`（不支持 Nest 12）、`instrumentation-fs`（噪音）
- OTLP logs / metrics 默认关闭（`OTEL_LOGS_EXPORTER=none`、`OTEL_METRICS_EXPORTER=none`），避免与 pino→Loki 重复
- 采样：开发 `parentbased_always_on`；生产建议 `OTEL_TRACES_SAMPLER=parentbased_traceidratio` + `OTEL_TRACES_SAMPLER_ARG=0.1`

## 4. 日志内容

每个请求一条 completion log（`/api/dev` 与 SSE 除外）：

```json
{
  "level": "info",
  "time": "2026-11-28T04:23:21.806Z",
  "traceId": "54e0...",
  "requestId": "f004...",
  "userId": "...",
  "tenantId": "...",
  "req": { "id": "...", "method": "GET", "url": "/api/me/tenants", "headers": { "authorization": "***" } },
  "res": { "statusCode": 200 },
  "responseTime": 13,
  "reqBody": null,
  "resBody": [{ "id": "...", "slug": "default" }],
  "msg": "request completed"
}
```

约束：

- 请求/响应体 **脱敏**（password / token / authorization / cookie / apiKey…）
- 单条 body 超过 `LOG_BODY_LIMIT`（默认 16KB）只保留预览
- multipart / SSE / 开发导航页不记录 body
- 4xx → `warn`，5xx / 异常 → `error`（带堆栈）
- 生产默认 `LOG_HTTP_BODY=false`（性能与隐私），需要排查时临时打开
- `level` 输出字符串（`info` / `warn` / `error`…），Alloy 才能直接做 label

## 5. 本地可观测性栈

```bash
# 只起数据库/Redis（默认）
docker compose up -d

# 额外起 Loki + Alloy + Grafana + Tempo
docker compose --profile observability up -d
```

| 服务 | 端口 | 入口 |
| --- | --- | --- |
| Loki | 47110 | `http://localhost:47110/ready` |
| Grafana | 47111 | `http://localhost:47111`（匿名可看，管理员 admin/admin） |
| Alloy | 47112 | `http://localhost:47112`（组件状态 / live debugging） |
| Tempo（查询 UI/API） | 47113 | `http://localhost:47113/ready` |
| Tempo OTLP HTTP | 47114 | 应用 `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Tempo OTLP gRPC | 47115 | 可选，gRPC exporter 用 |

配置位置：`docker/observability/`

- `loki-config.yaml`：单进程 filesystem，保留 7 天，开启 structured metadata
- `alloy-config.alloy`：tail `logs/*.log` → 解析 JSON → `level` 做 label，traceId/requestId/userId/tenantId 做 structured metadata
- `tempo-config.yaml`：单进程 local 存储，OTLP HTTP/gRPC 接收，保留 24h
- `grafana/provisioning`：预置 Loki + Tempo 数据源（Tempo 可跳同 traceId 的 Loki 日志）

应用侧：`.env` 设置 `LOG_FILE=../../logs/app.log`（相对 `apps/server`），Alloy 挂载项目根 `./logs`。
生产容器不配 `LOG_FILE`，只写 stdout，由容器日志采集（Alloy `discovery.docker` / K8s）。

验证：

```bash
curl -s http://localhost:47100/api/health > /dev/null
curl -s -G http://localhost:47110/loki/api/v1/query_range \
  --data-urlencode '{service="starter-api"}' --data-urlencode 'limit=5'
```

## 6. 查询 API 与管理端日志页

后端 `apps/server/src/logs/`：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/logs` | 时间范围 / level / traceId / userId / tenantId / path / keyword 检索 |
| GET | `/api/logs/stats?range=15m` | 按 level 统计（页面徽章 + 分页总数） |
| GET | `/api/logs/trace/:traceId` | 同 traceId 时间线（近 24h 升序） |

- 平台管理员专用（`PlatformAdminGuard`）
- Loki 不可达时返回 502/503，不影响业务接口
- 分页为近似（Loki 无 offset）：`limit = page*pageSize + 1` 后切片，单次上限 5000

管理端 `apps/admin`：`/observability/logs`

- DataTable 服务端模式；时间范围 / 级别筛选，关键词搜索路径
- 顶部按 level 统计徽章
- 行详情抽屉：完整 JSON（已脱敏）+ 同 traceId 时间线

## 7. 审计日志

已落地，见 `apps/server/src/audit/`：

- 表 `audit_logs`（append-only）：`actorUserId` / `actorLabel` / `tenantId` / `action` / `resource` / `result` / `before` / `after` / `traceId` / `ip` / `userAgent`
- 数据库层 RLS 禁止 UPDATE / DELETE（不建 policy），写入用 `createMany`
- 关键写操作在 controller 加 `@Audit({ action, resource })`；登录在 `CredentialsService` 手动记录成功 / 失败
- 查询：`GET /api/audit-logs`、`GET /api/audit-logs/:id`（平台管理员）
- 管理端 `/observability/audit-logs`
- 与请求日志分开：请求日志是排障数据（Loki，短保留），审计是合规数据（PostgreSQL，长保留）

## 8. 性能与容量

- pino overhead 低；成本主要来自 body 序列化与日志量
- 成功请求 body 日志生产默认关闭；错误 / 慢请求可 100%
- 慢查询：阈值 `SLOW_SQL_MS` 默认 100ms；`SLOW_SQL_LOG_PARAMS` 默认关闭（参数可能含业务数据）
- Loki 查询必须限制时间范围，按 label（service/env/level）过滤
- label 基数：只放 service/env/level；traceId/userId/tenantId 用 structured metadata
- OTel 只保留 HTTP client / pg / dns 等基础插桩；`instrumentation-nestjs-core` 必须关闭（不支持 Nest 12）
- Tempo 本地保留 24h；生产换对象存储（S3/MinIO），采样率按流量调低

## 9. 验证基线

- `/api/health` 响应头有 `X-Trace-Id` / `traceparent`
- 入站 `traceparent` 被复用
- 登录请求日志中 `password` / `accessToken` 为 `[REDACTED]`
- 401/500 响应体带 `traceId`，日志级别 warn/error
- 日志页能按 level / 时间范围 / traceId 查到对应请求
- 审计页能查到登录成功/失败与租户 CRUD，`after` 不含密码
- 慢查询日志：`SLOW_SQL_MS=1` 时日志出现 `msg:"slow query"`（带 traceId / model / operation）
- Tempo：`GET /api/traces/<响应头 traceId>` 200，含 `GET /api/...` server span 与 `pg.query:*` 子 span
- `pnpm --filter @starter/server test:e2e`、`test:tenants`、`test:rls`、`test:generated`、`test:logs`、`test:audit`、`test:traces` 全过
