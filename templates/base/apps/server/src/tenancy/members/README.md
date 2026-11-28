# tenancy/members — 租户成员管理

## 职责

- 维护「用户 ↔ 租户」关系（`UserTenant`）与成员在当前租户下的角色（`UserRole`）
- 查询：租户内任意成员可见（需 `user:read`）；写：`user:write`（`owner` / `admin` 视为全权限）
- 不修改全局 `User`（邮箱、密码、账号状态由平台「用户管理」负责）
- 不能修改 / 移除自己，避免管理员把自己锁出租户

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `members.module.ts` | Nest 子模块：imports `TenancyCoreModule`，exports `MembersService` |
| `members.controller.ts` | `/t/:tenantId/members` REST 接口 |
| `members.service.ts` | 成员业务、自我操作保护、最后一个管理员保护 |
| `repositories/members.repository.ts` | Prisma 查询（事务客户端） |
| `dto/` | 查询 / 添加 / 更新 / 响应结构 |

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/t/:tenantId/members` | user:read | 分页 + `status` + `keyword`（email / displayName） |
| POST | `/t/:tenantId/members` | user:write | 按邮箱添加已存在用户，角色默认 `member` |
| PATCH | `/t/:tenantId/members/:userId` | user:write | 更新租户内状态 / 整体替换角色 |
| DELETE | `/t/:tenantId/members/:userId` | user:write | 移除成员及其在本租户的角色 |

## 数据与隔离

- `UserTenant` / `User` 是全局表，Repository **显式**带 `tenantId` 过滤
- `UserRole` 没有 `tenantId` 列：读写都通过 `role.tenantId` 收窄，避免带出其它租户的角色
- `Role` 受 RLS 保护，必须通过 `@TenantTx()` 事务客户端访问（Interceptor 已设置 `app.tenant_id`）
- 角色 code 必须存在于当前租户，否则 400

## 审计

- `member.create` / `member.update` / `member.delete`
- 更新 / 删除前在 service 里 `AuditContext.setBefore(旧成员快照)`

## 注意

- 添加成员按邮箱查找全局用户；模板不向租户管理员暴露全局用户搜索，避免跨租户枚举
- 用户不存在 → 404，并提示先由平台管理员在「用户管理」创建账号
- 账号被禁用 → 400；已加入 → 409
