# tenancy/permission-catalog/repositories

## 职责

租户权限目录读取（`TenantPermissionCatalogRepository`）。

## 约束

- `Permission` 是全局表，走 `prisma.scoped.permission`
- 只读，不提供创建/更新/删除（平台级 CRUD 在 `src/permissions/`）
