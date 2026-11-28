# permissions/repositories

## 职责

平台权限点数据访问（`PermissionsRepository`）。

## 约束

- `Permission` 是全局表，走 `prisma.scoped.permission`
- 只用于平台级 CRUD；租户内只读目录在 `tenancy/permission-catalog/repositories/`
