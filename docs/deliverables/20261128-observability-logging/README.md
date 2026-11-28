# 可观测性 / 日志系统 — 归档

> 状态：**已归档**（2026-11-28）
> 范围：请求日志、traceId、Loki、Tempo、审计、慢查询、Grafana、轮转、告警
> 规范：`docs/guides/logging-and-tracing.md`（架构与运维）、`docs/guides/logging-conventions.md`（业务打印规范）

## 1. 交付范围

| 能力 | 实现 | 状态 |
| --- | --- | --- |
| 请求日志 | pino + nestjs-pino，自动完成日志（req/res、状态、耗时、userId/tenantId） | ✅ |
| traceId | W3C `traceparent`，所有响应头 + 错误体 | ✅ |
| 日志存储 | stdout + `logs/app.YYYY-MM-DD.N.log` → Alloy → Loki | ✅ |
| 日志查询 | `/starter/api/logs`、`/stats`、`/trace/:id` + 管理端日志页 | ✅ |
| 审计 | `audit_logs` append-only（RLS 禁改删），`@Audit` + before/after | ✅ |
| 慢查询 | `scoped` extension + 租户事务计时，默认 100ms | ✅ |
| 链路追踪 | OTel → Tempo，server span + pg 子 span | ✅ |
| Grafana | Loki/Tempo 数据源、Starter 概览、2 条告警规则 | ✅ |
| 日志轮转 | pino-roll，按天/50m，保留 7 个 | ✅ |
| 本地凭据 | 开发导航页「本地凭据」统一展示 | ✅ |

## 2. 架构

```text
请求 ──► TraceMiddleware（OTel server span / traceId）
          │
          ├── LoggingInterceptor（出入参脱敏 + 截断）
          │        │
          │        └── pino completion log ──► stdout / logs/*.log
          │                                             │
          │                                          Alloy ──► Loki ──► Grafana / 管理端日志页
          │
          └── OTLP ──► Tempo ──► Grafana（span 瀑布）

关键写操作 ──► @Audit ──► audit_logs（PostgreSQL，append-only）
慢查询 ──► scoped extension / 租户事务 ──► pino warn
```

## 3. 代码位置

| 位置 | 职责 |
| --- | --- |
| `apps/server/src/logging/` | 请求日志、trace 上下文、脱敏、异常响应、pino 配置 |
| `apps/server/src/logs/` | Loki 查询 API |
| `apps/server/src/audit/` | 审计写入/查询 |
| `apps/server/src/tracing.ts` | OTel SDK 初始化 |
| `apps/server/src/dev/` | 开发导航页探活与凭据 |
| `docker/observability/` | Loki / Alloy / Tempo / Grafana 配置 |
| `apps/admin/src/features/observability/` | 日志页、审计页 |

## 4. 配置

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `LOG_LEVEL` | 开发 `debug` / 生产 `info` | pino 级别 |
| `LOG_HTTP_BODY` | 开发 `true` / 生产 `false` | 是否记录出入参 |
| `LOG_BODY_LIMIT` | `16384` | body 日志字符上限 |
| `LOG_FILE` | 空（开发 `.env` 配 `../../logs/app.log`） | 额外写文件 |
| `LOG_ROTATE_FREQUENCY` | `daily` | 轮转频率 |
| `LOG_ROTATE_SIZE` | `50m` | 单文件上限 |
| `LOG_ROTATE_KEEP` | `7` | 保留历史文件数 |
| `SLOW_SQL_MS` | `100` | 慢查询阈值，`<=0` 关闭 |
| `SLOW_SQL_LOG_PARAMS` | `false` | 慢查询是否记参数 |
| `OTEL_ENABLED` | `false` | 是否启用 OTel |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:47114` | Tempo OTLP HTTP |
| `LOKI_URL` | `http://localhost:47110` | 日志查询地址 |

## 5. 验收结果

```text
pnpm build                          ✅
pnpm lint                           ✅（仅既有 warning）
test:e2e / test:tenants             ✅
test:rls / test:generated           ✅
test:logs / test:audit / test:traces ✅
```

ego 实际验证：

- 日志页：搜索 / 级别筛选 / 详情 / traceId 时间线
- 审计页：UI 新建 + 改名租户，详情同时展示 before / after
- Grafana：Starter 概览有数据、Loki/Tempo Explore 可查、告警规则 `health=ok`
- dev 页：本地凭据（server / PG / Redis / Penpot / Grafana）

## 6. 已知边界

| 边界 | 说明 | 后续 |
| --- | --- | --- |
| 生产采集 | Alloy 目前配置为读本地 `logs/*.log`；容器 stdout 的 `discovery.docker` 未示例 | 按部署平台补 |
| 审计 before | 仅在租户 CRUD 接入；新写操作需手动 `AuditContext.setBefore` | 规范已写明 |
| 审计补偿 | 写入失败只 `warn`，无重试队列 | 强合规场景再加 |
| 租户级日志页 | 日志查询只对平台管理员 | 按需求再加 |
| keyword 搜索 | 对整行 JSON 包含匹配，可能命中 resBody 内容 | 需要时改字段级过滤 |
| 慢查询 | 事务内只记事务总耗时，不逐条 SQL | Prisma 能力限制 |
| 生产告警通知 | 默认 email，本地无 SMTP | 接 Slack / Webhook |
| barrel | server 内部不用 barrel（见 AGENTS） | — |

## 7. 运维手册

```bash
# 启动本地依赖（默认含可观测性栈）
docker compose up -d

# 日志页
open http://localhost:47174/observability/logs
# 审计页
open http://localhost:47174/observability/audit-logs
# Grafana
open http://localhost:47111/d/starter-overview

# 查单次请求
# 1) 响应头 X-Trace-Id
# 2) 日志页搜索 traceId，或 Tempo 输入 traceId
```

本地凭据在 `http://localhost:47100/starter/api/dev#services` 的「本地凭据」卡片。
