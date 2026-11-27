# auth/guards

## 职责

认证/授权守卫。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenant-membership.guard.ts` | 校验用户属于该租户（非成员 404、角色不足 403），并把 membership 挂到 request |

## 注意事项

- 租户路由必须挂本 guard；它只读 `req.params.tenantId`，参数名不能改。
- 角色查询在事务内设置 `app.tenant_id`，避免 `role` 表被 RLS 过滤。
