# 日志与链路追踪

> 2026-11-28 落地 P0（pino + traceId）、P1（Loki + Alloy + Grafana + 管理端日志页）。
> 实现见 `apps/server/src/logging/`（写入）、`apps/server/src/logs/`（查询）与 `apps/admin/src/features/observability/logs/`。

## 1. 选型

| 能力 | 方案 | 原因 |
| --- | --- | --- |
| 日志引擎 | **pino + nestjs-pino** | 社区主流（pino 周下载 78M、nestjs-pino 4.6M）；NodeAdapter 已实测兼容 |
| 请求上下文 | 自建 `RequestContext` ALS | traceId 贯穿全链路，业务不用传参 |
| 日志存储 | **stdout JSON + `logs/app.log` → Alloy → Loki** | 请求日志不进业务库，避免 276GB/天级膨胀 |
| 审计日志 | PostgreSQL `audit_logs`（后续需求） | 关键写操作长期保留 |
| 链路追踪 | W3C `traceparent`；OTel 后续 | 先保证 traceId 串联，再上 span 瀑布 |

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
```

- **应用/请求日志**：pino JSON 写 stdout；开发同时写 `logs/app.log` 供本地 Alloy 采集
- **审计日志**：PostgreSQL 独立表（后续），不混入请求日志
- **慢 SQL**：Prisma `$on("query")`，只记 >100ms（待接入）
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

# 额外起 Loki + Alloy + Grafana
docker compose --profile observability up -d
```

| 服务 | 端口 | 入口 |
| --- | --- | --- |
| Loki | 47110 | `http://localhost:47110/ready` |
| Grafana | 47111 | `http://localhost:47111`（匿名可看，管理员 admin/admin） |
| Alloy | 47112 | `http://localhost:47112`（组件状态 / live debugging） |

配置位置：`docker/observability/`

- `loki-config.yaml`：单进程 filesystem，保留 7 天，开启 structured metadata
- `alloy-config.alloy`：tail `logs/*.log` → 解析 JSON → `level` 做 label，traceId/requestId/userId/tenantId 做 structured metadata
- `grafana/provisioning`：预置 Loki 数据源

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

## 7. 审计日志（后续）

- 独立表 `audit_logs`：actor / tenant / action / target / before / after / traceId / ip
- 关键写操作（登录、改密、租户/角色/成员变更）落库，长期保留
- 与请求日志分开：请求日志是排障数据（短保留），审计是合规数据（长保留）

## 8. 性能与容量

- pino overhead 低；成本主要来自 body 序列化与日志量
- 成功请求 body 日志生产默认关闭；错误 / 慢请求可 100%
- Loki 查询必须限制时间范围，按 label（service/env/level）过滤
- label 基数：只放 service/env/level；traceId/userId/tenantId 用 structured metadata
- OTel 若接入：关闭 `@opentelemetry/instrumentation-nestjs-core`（不支持 Nest 12），只保留 HTTP/pg 等基础插桩

## 9. 验证基线

- `/api/health` 响应头有 `X-Trace-Id` / `traceparent`
- 入站 `traceparent` 被复用
- 登录请求日志中 `password` / `accessToken` 为 `[REDACTED]`
- 401/500 响应体带 `traceId`，日志级别 warn/error
- 日志页能按 level / 时间范围 / traceId 查到对应请求
- `pnpm --filter @starter/server test:e2e`、`test:tenants`、`test:rls`、`test:generated` 全过
