# tenants/provisioning — 新租户初始化

## 职责

- 新建租户时创建内置 `admin` / `member` 角色，并绑定模板权限
- 可选：把已存在的全局用户加入租户并授予 `admin`（创建租户时的初始管理员）
- seed 与「新建租户」复用同一套权限/角色模板，避免定义漂移

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `role-templates.ts` | 权限点与内置角色模板（唯一来源） |
| `ensure-roles.ts` | `ensurePermissions()` / `ensureTenantRoles()`：幂等补齐权限、角色、角色权限 |
| `provision-tenant.ts` | `provisionTenant(tx, tenantId, opts)`：新租户完整初始化 |

## 约束

- `Role` / `RolePermission` 受 RLS 保护，调用前必须 `set_config('app.tenant_id', tenantId, true)`（`provisionTenant` 已处理）
- 必须在事务内调用；初始管理员不存在/已禁用时抛错，事务回滚，不留下半成品租户
- 初始管理员必须是已存在的全局用户；用户创建/邀请流程不在这里
- 不负责租户套餐、订阅等其它初始化
