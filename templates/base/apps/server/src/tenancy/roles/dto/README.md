# tenancy/roles/dto

## 职责

租户角色管理的入参、查询与出参 DTO。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `query-roles.dto.ts` | `QueryRolesDto`：page / pageSize / kind / keyword |
| `create-role.dto.ts` | `CreateRoleDto`：code、name、description、permissionCodes |
| `update-role.dto.ts` | `UpdateRoleDto`：name / description / permissionCodes |
| `role-response.dto.ts` | `RoleResponseDto` / `RoleListResponseDto` / `RoleOptionDto` |

## 注意事项

- `code` 只允许小写字母开头，可含数字、`-`、`_`，创建后不可改
- `permissionCodes` 传空数组表示清空权限；`RoleOptionDto` 只用于下拉
