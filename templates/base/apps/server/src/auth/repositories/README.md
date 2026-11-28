# auth/repositories

## 职责

认证模块的数据访问。密码哈希只在本层与 seed 出现，不向 Controller 暴露。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `auth-users.repository.ts` | `AuthUsersRepository`：认证用身份查询、登录凭据读取 |

## 注意事项

- `User` 是 UNSCOPED 全局表，可用 `prisma.scoped`
- 平台用户 CRUD 与 `/me` 查询在 `users/repositories/users.repository.ts`，不要与本文件混用
- 新增查询先 `select` 限定字段，再映射为对外类型
