# tenancy/dto

## 职责

租户上下文示例路由的出入参 DTO。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `role.dto.ts` | `RoleDto`：租户内角色的对外字段（id/code/name） |

## 注意事项

- 租户表查询结果先限定 `select`，再映射到 DTO，避免把 Prisma 实体整体返回。
- 新增路由的响应 DTO 要同步 `@ApiOkResponse({ type })`。
