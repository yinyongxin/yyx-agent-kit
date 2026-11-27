# tenants — 平台级租户管理

## 职责

平台管理员对**租户本身**的 CRUD（`/api/tenants`），不是租户内业务（`/api/t/:tenantId/...`，见 `../tenancy/`）。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenants.module.ts` | 模块装配 |
| `tenants.controller.ts` | REST 端点，挂 `PlatformAdminGuard` |
| `tenants.service.ts` | 业务：列表映射、slug 冲突、删除前依赖检查 |
| `repositories/tenants.repository.ts` | 数据访问（Tenant 是全局表，用 `prisma.scoped`） |
| `dto/` | 入参/出参/查询 DTO，详见该目录 README |

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/tenants` | 分页 + status/keyword 筛选 |
| GET | `/api/tenants/:id` | 详情 |
| POST | `/api/tenants` | 创建（slug 唯一） |
| PATCH | `/api/tenants/:id` | 更新 name/status（slug 不可改） |
| DELETE | `/api/tenants/:id` | 仅空租户；有成员/订阅返回 409 |

## 关键约定

- **权限**：只有 `PlatformAdmin`（`PlatformAdminGuard`）能访问；`@Can.Anyone()` 只是为了通过全局授权 guard。
- **删除**：只允许删「无成员、无订阅」的租户；停用请用 `PATCH status=suspended`。
- **创建**：不自动加成员（成员邀请属于后续阶段），因此新租户可立即删除，CRUD 自洽。
- **订阅统计**：`subscriptions` 启用 RLS，统计前需在事务内设置 `app.tenant_id`。

## 同步要求

- 新增端点同步 `API_ROUTES`、本文件与 `../README.md`。
- 改接口后运行 `pnpm api:generate`。
