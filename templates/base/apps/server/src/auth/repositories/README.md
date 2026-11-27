# auth/repositories

## 职责

认证模块的数据访问。密码哈希只在本层与 seed 出现，不向 Controller 暴露。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `users.repository.ts` | 全局身份查询、租户列表、登录凭据读取 |

## 注意事项

- `User` / `UserTenant` 是 UNSCOPED 全局表，可用 `prisma.scoped`；租户表必须接收调用方的 `tx`。
- 新增查询先 `select` 限定字段，再映射为对外类型。
