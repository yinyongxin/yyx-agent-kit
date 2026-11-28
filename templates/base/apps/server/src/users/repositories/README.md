# users/repositories

## 职责

平台用户数据访问（`UsersRepository`）。

## 约束

- `User` 是全局表，走 `prisma.scoped.user`
- 不返回 `passwordHash`；密码哈希只在 `auth/repositories/` 的登录查询里读取
- 与 `auth/repositories/auth-users.repository.ts` 区分：本文件是平台用户 CRUD，auth 文件是认证查询
