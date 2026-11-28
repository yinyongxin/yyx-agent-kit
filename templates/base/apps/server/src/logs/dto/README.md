# logs/dto — 日志查询参数与响应

## 职责

- 校验 `GET /api/logs` 查询参数（range / level / traceId / userId / tenantId / path / keyword / 分页）
- 定义统一的日志条目、列表响应、级别统计结构
- `LOG_RANGES` / `LOG_LEVELS` 来自 `packages/shared`，与后端 DTO、管理端筛选共用

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `query-logs.dto.ts` | `QueryLogsDto`；re-export `LOG_RANGES` / `LOG_LEVELS` 及类型 |
| `log-entry.dto.ts` | `LogEntryDto` / `LogQueryResponseDto` / `LogLevelStatsDto` |

## 同步要求

- 新增筛选条件：先加 `QueryLogsDto` 字段，再改 `logs.service.ts` 的 `buildQuery`
- 新增日志字段：同步 `LogEntryDto`、`logs.service.ts` 的 `flatten` 与管理端详情抽屉
- 时间范围 / 级别枚举只改 `packages/shared`，不要在前后端各写一份
