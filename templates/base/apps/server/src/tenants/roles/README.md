# tenants/roles — 平台级租户角色选项

## 职责

平台管理员跨租户查看角色选项（`/tenants/:tenantId/roles/options`），供平台级成员管理选择角色。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `platform-roles.controller.ts` | `PlatformTenantRolesController` |
| `platform-roles.service.ts` | `PlatformRolesService`：复用 `tenancy/roles` 的 `RolesService` |

## 说明

- 不是独立 Nest 子模块，controller/service 由 `TenantsModule` 注册
- 必需原因：平台管理员可能不是该租户成员，不能走租户成员接口
- 角色完整 CRUD 仍在租户内 `/t/:tenantId/roles`
