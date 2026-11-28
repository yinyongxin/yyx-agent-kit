# permissions — 平台权限点管理

## 职责

- 平台管理员维护全局权限点（`Permission`）：列表 / 详情 / 创建 / 更新 / 删除
- 权限点是全局定义，**不属于某个租户**；租户通过角色（`RolePermission`）引用
- `code` 采用 `resource:action` 形式，创建后不可修改
- 删除前检查是否仍被角色引用；被引用时 409
- 内置权限点由 seed 维护，删除后再次 seed 会被重新创建

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `permissions.module.ts` | 注册 controller / service / repository |
| `permissions.controller.ts` | `/permissions` REST 接口（平台管理员） |
| `permissions.service.ts` | 业务逻辑：code 唯一、空更新校验、引用数保护、审计 before |
| `permissions.repository.ts` | Prisma 查询（`prisma.scoped.permission`，全局表） |
| `dto/` | 查询 / 创建 / 更新 / 响应结构 |

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/permissions` | 分页 + name/code 搜索，返回角色引用数 |
| GET | `/permissions/:id` | 详情 |
| POST | `/permissions` | 创建（code + name） |
| PATCH | `/permissions/:id` | 更新 name / description |
| DELETE | `/permissions/:id` | 删除（被角色引用返回 409） |

## 审计

- `permission.create` / `permission.update` / `permission.delete`
- 更新 / 删除前 `AuditContext.setBefore(旧值)`

## 关联

- 租户侧只读目录：`tenancy/permissions/`（`GET /t/:tenantId/permissions`）
- 角色权限分配：`tenancy/roles/`
