# files/repositories

| 文件 | 作用 |
| --- | --- |
| `files.repository.ts` | `FilesRepository`：分页、关键词、分类筛选、按租户查/删 |

- 只接受 `Prisma.TransactionClient`（来自 `@TenantTx()`），依赖 RLS 做租户隔离
- 查询显式带 `tenantId`，便于索引命中并形成双保险
- 列表用 `count + findMany` 并行；分类条件集中在 `categoryWhere()`
