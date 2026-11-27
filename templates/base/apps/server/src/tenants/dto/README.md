# tenants/dto

## 职责

租户 CRUD 的入参、查询与出参 DTO。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `create-tenant.dto.ts` | `CreateTenantDto`：name、slug（slug 格式/长度校验） |
| `update-tenant.dto.ts` | `UpdateTenantDto`：name/status，slug 不可改 |
| `query-tenants.dto.ts` | `QueryTenantsDto`：page/pageSize/status/keyword |
| `tenant-response.dto.ts` | `TenantResponseDto`：对外字段 |
| `tenant-list-response.dto.ts` | `TenantListResponseDto`：items + 分页字段 |

## 注意事项

- 出参 DTO 不包含 Prisma 内部字段；`slug` 创建后不可修改。
- 分页上限 100，避免深分页拖库。
