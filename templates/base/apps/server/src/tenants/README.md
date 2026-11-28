# tenants — 平台级租户管理

## 职责

平台管理员对**租户本身**的 CRUD（`/starter/api/tenants`），以及跨租户成员引导/恢复（`/starter/api/tenants/:tenantId/members`）。

租户内业务仍走 `/starter/api/t/:tenantId/...`，见 `../tenancy/`。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenants.module.ts` | 模块装配：租户 CRUD + 平台级成员/角色选项 |
| `tenants.controller.ts` | 租户 CRUD，挂 `PlatformAdminGuard` |
| `tenants.service.ts` | 列表映射、slug 冲突、创建事务、删除前依赖检查 |
| `repositories/tenants.repository.ts` | 数据访问（Tenant 是全局表，走 `prisma.scoped`） |
| `provisioning/` | 新租户初始化：权限/角色模板、初始管理员 |
| `members/` | 平台级成员管理：`/tenants/:tenantId/members`，可跨租户引导/恢复 |
| `roles/` | 平台级角色选项：`/tenants/:tenantId/roles/options` |
| `dto/` | 入参/出参/查询 DTO，详见该目录 README |

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/starter/api/tenants` | 分页 + status/keyword 筛选 |
| GET | `/starter/api/tenants/:id` | 详情 |
| POST | `/starter/api/tenants` | 创建；可选 `initialAdminEmail`（已存在用户） |
| PATCH | `/starter/api/tenants/:id` | 更新 name/status（slug 不可改） |
| DELETE | `/starter/api/tenants/:id` | 仅空租户；有成员/订阅返回 409 |
| GET | `/starter/api/tenants/:tenantId/members` | 平台级成员列表 |
| POST | `/starter/api/tenants/:tenantId/members` | 平台级添加成员（super） |
| PATCH | `/starter/api/tenants/:tenantId/members/:userId` | 平台级改角色/状态（super） |
| DELETE | `/starter/api/tenants/:tenantId/members/:userId` | 平台级移除（super） |
| GET | `/starter/api/tenants/:tenantId/roles/options` | 平台级角色选项 |

## 关键约定

- **权限**：租户 CRUD 与平台级成员读操作要求 `PlatformAdmin`；平台级成员写操作要求 `super`（`@RequirePlatformAdminLevel("super")`）
- **创建事务**：租户 + 内置 `admin`/`member` 角色 + 可选初始管理员在同一事务；初始管理员不存在/禁用则整体回滚
- **初始管理员**：只接受已存在的全局用户；用户创建/邀请不在这里
- **最后管理员保护**：平台级操作不能移除/停用/降级租户最后一个管理员；唯一管理员且无其他成员时允许移除（用于回收空租户）
- **删除**：只允许删「无成员、无订阅」的租户；软删除同时写 `status=suspended` + `deletedAt`，停用请用 `PATCH status=suspended`
- **订阅统计**：`subscriptions` 启用 RLS，统计前需在事务内设置 `app.tenant_id`

## 同步要求

- 新增端点同步 `API_ROUTES`、本文件与 `../README.md`
- 改接口后运行 `pnpm api:generate`
- 权限/角色模板改动同步 `provisioning/role-templates.ts`（seed 共用）
