# users — 平台用户管理与当前用户资源

## 职责

- 平台管理员维护全局用户：列表 / 详情 / 创建 / 更新 / 删除
- `/me`：当前登录用户资料与所属租户（不要求平台管理员）
- 用户是全局身份表（`User`），**不属于某个租户**；租户成员关系在 `user_tenants`，由 `tenancy` 模块维护
- 创建用户时生成 `authSubject = local:<uuid>` 与 scrypt 密码哈希；接口永远不返回 `passwordHash`
- 删除用户会级联移除其 `UserTenant` / `UserRole` / `PlatformAdmin`；禁止删除当前登录用户

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `users.module.ts` | 注册用户 CRUD + `/me` 控制器 |
| `users.controller.ts` | `/users` REST 接口（平台管理员） |
| `me.controller.ts` | `/me`、`/me/tenants`、`PATCH /me`、`POST /me/password` |
| `me.service.ts` | 当前用户资料与密码修改（校验旧密码） |
| `users.service.ts` | 用户 CRUD 业务：唯一性、密码哈希、审计 before |
| `repositories/users.repository.ts` | Prisma 查询（`prisma.scoped.user`；含 profile / tenants） |
| `dto/` | 用户 CRUD、`MeResponseDto`、`TenantSummaryDto` |

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/users` | 分页 + `status` + `keyword`（email / displayName） |
| GET | `/users/:id` | 详情 |
| POST | `/users` | 创建（email + password） |
| PATCH | `/users/:id` | 更新 displayName / status / email / password |
| DELETE | `/users/:id` | 删除（不能删自己） |
| GET | `/me` | 当前用户资料 + `isPlatformAdmin` / `platformAdminLevel` |
| PATCH | `/me` | 修改当前用户显示名 |
| POST | `/me/password` | 修改密码（校验旧密码，204） |
| GET | `/me/tenants` | 当前用户所属租户 |

## 审计

- `user.create` / `user.update` / `user.delete`
- `user.profile.update` / `user.password.change`
- 更新/删除前在 service 里 `AuditContext.setBefore(旧值)`，审计详情可对比 before/after

## 注意

- 用户创建后默认没有租户；需要平台管理员在租户成员里添加
- `email` 可空（外部 OIDC 用户），本地创建必填且唯一
- 密码由 `new PasswordHasher().hash()` 处理（与 seed 一致）
- `/me` 已从 `auth/` 迁到本模块；认证相关的凭据查询仍在 `auth/repositories/auth-users.repository.ts`
- 修改密码不会使已签发的 JWT 立即失效（当前模板无 session store）；生产接入 session store 后再补 token 失效
