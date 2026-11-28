# tenancy/members/dto

## 职责

租户成员管理的入参、查询与出参 DTO。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `query-members.dto.ts` | `QueryMembersDto`：page / pageSize / status / keyword |
| `add-member.dto.ts` | `AddMemberDto`：email + 可选 roleCodes |
| `update-member.dto.ts` | `UpdateMemberDto`：status / roleCodes（至少传一个） |
| `member-response.dto.ts` | `MemberResponseDto` / `MemberListResponseDto` |

## 注意事项

- 角色用 `roleCodes`（对外稳定标识），不暴露数据库角色 id
- 出参同时带全局账号状态（`userStatus`）与租户内成员状态（`status`）
