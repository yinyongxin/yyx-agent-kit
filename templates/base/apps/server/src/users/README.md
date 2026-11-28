# users — 平台用户管理

## 职责

- 平台管理员维护全局用户：列表 / 详情 / 创建 / 更新 / 删除
- 用户是全局身份表（`User`），**不属于某个租户**；租户成员关系在 `user_tenants`，由 `tenancy` 模块维护
- 创建用户时生成 `authSubject = local:<uuid>` 与 scrypt 密码哈希；接口永远不返回 `passwordHash`
- 删除用户会级联移除其 `UserTenant` / `UserRole` / `PlatformAdmin`；禁止删除当前登录用户

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `users.module.ts` | 注册 controller / service / repository |
| `users.controller.ts` | `/users` REST 接口（平台管理员） |
| `users.service.ts` | 业务逻辑：唯一性校验、密码哈希、审计 before |
| `users.repository.ts` | Prisma 查询（`prisma.scoped.user`，全局表放行） |
| `dto/` | 查询 / 创建 / 更新 / 响应结构 |

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/users` | 分页 + `status` + `keyword`（email / displayName） |
| GET | `/users/:id` | 详情 |
| POST | `/users` | 创建（email + password） |
| PATCH | `/users/:id` | 更新 displayName / status / email / password |
| DELETE | `/users/:id` | 删除（不能删自己） |

## 审计

- `user.create` / `user.update` / `user.delete`
- 更新/删除前在 service 里 `AuditContext.setBefore(旧值)`，审计详情可对比 before/after

## 注意

- 用户创建后默认没有租户；需要管理员在租户成员里添加
- `email` 可空（外部 OIDC 用户），本地创建必填且唯一
- 密码由 `new PasswordHasher().hash()` 处理（与 seed 一致）
