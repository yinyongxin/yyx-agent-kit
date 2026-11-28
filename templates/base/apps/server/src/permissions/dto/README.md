# permissions/dto

## 职责

平台权限点管理的入参、查询与出参 DTO。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `query-permissions.dto.ts` | `QueryPermissionsDto`：page / pageSize / keyword |
| `create-permission.dto.ts` | `CreatePermissionDto`：code、name、description |
| `update-permission.dto.ts` | `UpdatePermissionDto`：name / description |
| `permission-response.dto.ts` | `PermissionResponseDto` / `PermissionListResponseDto` |

## 注意事项

- `code` 必须是 `resource:action` 形式，创建后不可改
- 响应包含 `roleCount`（引用该权限点的角色数），用于删除保护提示
