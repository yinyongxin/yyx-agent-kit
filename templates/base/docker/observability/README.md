# observability — 本地日志栈配置

随 `docker compose --profile observability up -d` 启动，默认不参与日常开发。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `loki-config.yaml` | Loki 单进程配置（filesystem、保留 7 天、structured metadata） |
| `alloy-config.alloy` | Alloy 采集 `logs/*.log`：解析 JSON，`level` 做 label，traceId 等做 structured metadata |
| `grafana/provisioning/datasources/loki.yaml` | Grafana 预置 Loki 数据源 |
| `grafana/provisioning/dashboards/dashboards.yaml` | Dashboard provider（`grafana/dashboards` 下的 JSON 自动加载） |

## 端口

| 服务 | 宿主端口 | 说明 |
| --- | --- | --- |
| Loki | 47110 | `GET /ready` 探活，`/loki/api/v1/*` 查询 |
| Grafana | 47111 | 浏览器查看，匿名 Viewer |
| Alloy | 47112 | 组件状态 / live debugging |

## 数据流

```text
apps/server（pino） ──► logs/app.log ──► Alloy ──► Loki ──► Grafana / 管理端日志页
```

应用日志默认同时写 stdout 和 `logs/app.log`（`LOG_FILE`）。生产不写文件，由容器日志采集（Alloy `discovery.docker` 或 K8s）。

## 注意

- label 只保留 `service` / `env` / `level`；traceId / userId / tenantId 用 structured metadata，**不要**改成 label（高基数）
- 本地保留 168h；需要长期保留换对象存储并单独部署 compactor
- 修改配置后 `docker compose --profile observability restart loki alloy grafana`
- 管理端日志页依赖 `LOKI_URL`（默认 `http://localhost:47110`）与 `LOG_SERVICE_NAME`（默认 `starter-api`）
