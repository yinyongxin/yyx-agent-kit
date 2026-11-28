# observability — 本地可观测性栈配置

随 `docker compose up -d` 默认启动，日常开发即可使用管理端日志页与 Grafana。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `loki-config.yaml` | Loki 单进程配置（filesystem、保留 7 天、structured metadata） |
| `alloy-config.alloy` | Alloy 采集 `logs/*.log`：解析 JSON，`level` 做 label，traceId 等做 structured metadata |
| `tempo-config.yaml` | Tempo 单进程配置（local 存储、OTLP HTTP/gRPC、保留 24h） |
| `grafana/provisioning/datasources/loki.yaml` | Grafana 预置 Loki + Tempo 数据源（Tempo 可跳同 traceId 日志） |
| `grafana/provisioning/dashboards/dashboards.yaml` | Dashboard provider（`grafana/dashboards` 下的 JSON 自动加载） |
| `grafana/provisioning/alerting/rules.yaml` | 告警规则：错误日志过多 / 慢请求过多 |

## 端口

| 服务 | 宿主端口 | 说明 |
| --- | --- | --- |
| Loki | 47110 | `GET /ready` 探活，`/loki/api/v1/*` 查询 |
| Grafana | 47111 | 浏览器查看，匿名 Viewer |
| Alloy | 47112 | 组件状态 / live debugging |
| Tempo（API） | 47113 | `GET /ready`、`/api/traces/<id>` 查 trace |
| Tempo（OTLP HTTP） | 47114 | 应用 `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Tempo（OTLP gRPC） | 47115 | gRPC exporter 用 |

## 本地凭据

| 服务 | 账号 | 密码 |
| --- | --- | --- |
| Grafana | `admin` | `starter_grafana_2026` |

- 由 `.env` 的 `GRAFANA_USER` / `GRAFANA_PASSWORD` 控制（首次创建数据卷时写入）
- 开发导航页 `http://localhost:47100/api/dev#services` 的「本地凭据」卡片会显示，点击可复制
- 预置 Dashboard：`Starter 概览`（`/d/starter-overview`），包含日志量、错误数、按 level 曲线与告警日志

## 数据流

```text
apps/server（pino） ──► logs/app.log ──► Alloy ──► Loki ──► Grafana / 管理端日志页

apps/server（OTel） ──► OTLP HTTP 47114 ──► Tempo ──► Grafana（span 瀑布）
```

- 应用日志默认同时写 stdout 和 `logs/app.log`（`LOG_FILE`）。生产不写文件，由容器日志采集（Alloy `discovery.docker` 或 K8s）
- 本地文件由 `pino-roll` 轮转：按天或超过 50m 切分，命名 `app.YYYY-MM-DD.N.log`，保留 7 个（`LOG_ROTATE_*`）
- Trace 由 `apps/server/src/tracing.ts` 导出；关闭时零开销（不加载 SDK）

## 注意

- label 只保留 `service` / `env` / `level`；traceId / userId / tenantId 用 structured metadata，**不要**改成 label（高基数）
- 本地 Loki 保留 168h、Tempo 保留 24h；长期保留换对象存储并单独部署 compactor
- 修改配置后 `docker compose restart loki alloy tempo grafana`
- 管理端日志页依赖 `LOKI_URL`（默认 `http://localhost:47110`）与 `LOG_SERVICE_NAME`（默认 `starter-api`）
- OTel 只导出 traces；logs 走 pino→Loki，metrics 暂不采集（`OTEL_LOGS_EXPORTER=none` / `OTEL_METRICS_EXPORTER=none`）
