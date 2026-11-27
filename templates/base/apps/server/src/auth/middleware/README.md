# auth/middleware

## 职责

认证模块的请求中间件。只做请求预处理，不做授权判断。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenant.middleware.ts` | 从 `/t/:tenantId` 解析租户并写入 `TenantContext`（不做成员校验） |

## 注意事项

- 成员校验是 `TenantMembershipGuard` 的职责，middleware 不做。
- 注册点在 `app.module.ts` 的 `configure()`。
