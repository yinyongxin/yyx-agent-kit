# tenancy/permission-catalog — 租户权限点目录（只读）

## 职责

- 返回全局权限点 `Permission` 列表，供租户管理员分配角色权限时使用
- 路由仍是 `GET /t/:tenantId/permissions`
- 只读；平台级权限点维护见 `src/permissions/`（`/permissions`）

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `permission-catalog.module.ts` | Nest 子模块：imports `TenancyCoreModule` |
| `permission-catalog.controller.ts` | `TenantPermissionCatalogController` |
| `permission-catalog.service.ts` | `TenantPermissionCatalogService` |
| `repositories/permission-catalog.repository.ts` | `prisma.scoped.permission` |
| `dto/permission.dto.ts` | `TenantPermissionDto` |

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/t/:tenantId/permissions` | role:read | 全部权限点（code / name / description） |

## 注意

- `Permission` 没有 `tenantId`，走 `prisma.scoped`，不需要租户事务
- 返回按 `code` 升序，前端可直接做多选
- 与 `src/permissions/` 的区别：前者只读目录，后者是平台级 CRUD
