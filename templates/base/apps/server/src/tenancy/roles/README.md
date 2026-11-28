# tenancy/roles — 租户角色管理

## 职责

- 维护租户内角色（`Role`）与角色权限（`RolePermission`）
- 查询：租户内任意成员可见（需 `role:read`）；写：`role:write`（`owner` / `admin` 视为全权限）
- 内置角色（`isSystem=true`，seed 维护的 `admin` / `member`）**只读**：不能改名、改权限、删除
- 自定义角色可创建 / 更新 / 删除；`code` 创建后不可修改
- 删除前检查是否有成员仍在使用，避免成员变成「无角色」

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `roles.module.ts` | Nest 子模块：imports `TenancyCoreModule`，exports `RolesService` |
| `roles.controller.ts` | `/t/:tenantId/roles` REST 接口 |
| `roles.service.ts` | 角色业务、内置角色保护、权限整体替换 |
| `repositories/roles.repository.ts` | Prisma 查询（事务客户端） |
| `dto/` | 查询 / 创建 / 更新 / 响应结构 |

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/t/:tenantId/roles` | role:read | 分页 + `kind`（system/custom）+ name/code 搜索 |
| GET | `/t/:tenantId/roles/options` | role:read | 全部角色精简列表（成员页下拉） |
| GET | `/t/:tenantId/roles/:roleId` | role:read | 详情（含权限点 code） |
| POST | `/t/:tenantId/roles` | role:write | 创建自定义角色（可选权限点） |
| PATCH | `/t/:tenantId/roles/:roleId` | role:write | name / description / 权限点整体替换 |
| DELETE | `/t/:tenantId/roles/:roleId` | role:write | 删除自定义角色（有成员 409） |

## 数据与隔离

- `Role` 带 `tenantId`，受 RLS 保护，全部查询走 `@TenantTx()`
- `RolePermission` / `UserRole` 没有 `tenantId`：只在确认角色属于当前租户后按 `roleId` 操作
- 权限点 `Permission` 是全局表，创建/更新时校验 code 必须存在，未知 code → 400
- 角色 code 在租户内唯一，冲突 → 409

## 审计

- `role.create` / `role.update` / `role.delete`
- 更新 / 删除前在 service 里 `AuditContext.setBefore(旧角色快照)`

## 注意

- 更新权限点采用「整体替换」语义；`permissionCodes: []` 表示清空
- 内置角色的权限由 seed 维护，避免接口改动与 seed 互相覆盖
