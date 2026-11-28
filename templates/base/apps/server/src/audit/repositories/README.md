# audit/repositories

## 职责

审计日志数据访问（`AuditRepository`）。

## 约束

- `audit_logs` 是 append-only；只提供写入与查询，不提供更新/删除
- 查询走 `prisma.scoped.auditLog`（全局表）
