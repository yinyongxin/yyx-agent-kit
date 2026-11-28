# tenancy/roles/repositories

## 职责

租户角色数据访问（`RolesRepository`）。

## 约束

- `Role` 受 RLS 保护，必须使用调用方的事务客户端
- `RolePermission` / `UserRole` 只在确认角色属于当前租户后按 `roleId` 操作
