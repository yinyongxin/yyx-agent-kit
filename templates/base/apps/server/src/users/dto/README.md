# users/dto

## 职责

平台用户 CRUD 与当前用户 `/me` 的入参/出参 DTO。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `create-user.dto.ts` | `CreateUserDto`：email、displayName、password |
| `update-user.dto.ts` | `UpdateUserDto`：可选字段；password 留空不修改 |
| `query-users.dto.ts` | `QueryUsersDto`：page / pageSize / status / keyword |
| `user-response.dto.ts` | `UserResponseDto` / `UserListResponseDto` |
| `me-response.dto.ts` | `MeResponseDto`：当前用户资料 + 平台管理员标记 |
| `tenant-summary.dto.ts` | `TenantSummaryDto`：我所属租户摘要 |
| `update-profile.dto.ts` | `UpdateProfileDto`：显示名 |
| `change-password.dto.ts` | `ChangePasswordDto`：当前密码 + 新密码 |
| `session-response.dto.ts` | `SessionResponseDto`：登录设备 / 会话 |

## 注意事项

- 出参不包含 `passwordHash` / `authSubject`
- `/me` 的 DTO 从 auth 迁入；认证凭据查询仍在 auth，不在本目录
