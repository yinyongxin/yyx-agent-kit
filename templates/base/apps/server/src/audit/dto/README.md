# audit/dto — 审计查询参数与响应

## 职责

- 校验 `GET /starter/starter/api/audit-logs` 查询参数（action / resource / result / actorUserId / tenantId / traceId / keyword / 时间范围 / 分页）
- 定义审计日志条目与列表响应结构（含 before / after）

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `query-audit-logs.dto.ts` | `QueryAuditLogsDto`、`AUDIT_RESULTS` |
| `audit-log.dto.ts` | `AuditLogDto` / `AuditLogListResponseDto` |

## 同步要求

- 新增筛选条件：先加 DTO 字段，再改 `AuditRepository.buildWhere`
- 新增审计字段：同步 `AuditLogDto`、`AuditQueryService.toDto` 与管理端详情抽屉
- `before` / `after` 为 JSON，DTO 里只声明 `Record<string, unknown>`，写入侧负责脱敏与截断
