# logs — Loki 日志检索

## 职责

- 管理端「日志」页的只读查询接口：按时间范围 / 级别 / traceId / userId / tenantId / 路径检索
- 按 traceId 返回完整时间线（近 24h，升序）
- 按级别统计窗口内条数（用于页面顶部徽章与分页总数）

写入链路在 `src/logging/`（pino → stdout / `logs/app.log` → Alloy → Loki）。本模块不写日志、不碰业务库。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `logs.module.ts` | 注册 controller 与 provider |
| `logs.controller.ts` | 平台管理员接口（`PlatformAdminGuard`） |
| `logs.service.ts` | 组装 LogQL、解析 Loki streams、排序 / 近似分页 |
| `loki.client.ts` | Loki HTTP API 封装（`query_range` / `query`） |
| `dto/query-logs.dto.ts` | 查询参数校验（range / level / traceId / page…） |
| `dto/log-entry.dto.ts` | 统一日志行与响应结构 |

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/starter/api/logs` | 日志检索，返回 `{ items, total, page, pageSize, hasMore }` |
| GET | `/starter/api/logs/stats?range=15m` | 按 level 统计窗口条数 |
| GET | `/starter/api/logs/trace/:traceId` | 同一 traceId 的时间线 |

`range`：`5m` / `15m` / `1h` / `6h` / `24h` / `7d`，也可传 `start` / `end`（ISO 8601，窗口 ≤ 7 天）。

## LogQL 约定

- **label**：`service` / `env` / `level`（低基数）
- **structured metadata**：`traceId` / `requestId` / `userId` / `tenantId`（可过滤，不做索引）
- `level` 同时是 label 与行内字段；查询用 `{service="starter-api", level="error"}`
- 路径 / 关键词用行过滤 `|= "..."`；traceId 等用 `| traceId="..."`

```logql
{service="starter-api", level="error"} |= "/api/tenants" | traceId="4bf9..."
```

## 分页

Loki 没有 offset / 精确 count：

- 列表按 `limit = page * pageSize + 1` 多取，再切片
- `total` 由 `stats` 的 `count_over_time` 提供（前端把 stats 总数写回表格）
- 单次最多取 5000 条；需要更大范围请缩窗口或用 Grafana Explore

## 配置

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `LOKI_URL` | `http://localhost:47110` | Loki 查询地址；为空时接口返回 503 |
| `LOG_SERVICE_NAME` | `starter-api` | 必须与 Alloy 写入的 `service` label 一致 |

## 注意

- 只给平台管理员；租户成员不应看到全平台请求日志
- 日志服务不可用时返回 502/503，不能让日志页拖垮主业务
- 查询结果里的 `raw` 是写入时的完整 JSON（已脱敏），不要在前端再次拼接敏感字段
- 新增筛选字段：先确认已写入日志（label 或 structured metadata），再扩展 DTO 与 `buildQuery`
