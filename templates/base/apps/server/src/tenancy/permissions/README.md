# tenancy/permissions — 权限点目录（只读）

## 职责

- 返回全局权限点 `Permission` 列表，供角色分配权限时使用
- 放在 `/t/:tenantId/permissions` 下：权限点是全局定义，但要求调用方是当前租户成员
- 只读；平台级权限点维护见 `src/permissions/`（`/permissions`）

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/t/:tenantId/permissions` | 成员 | 全部权限点（code / name / description） |

## 注意

- `Permission` 没有 `tenantId`，走 `prisma.scoped`，不需要租户事务
- 返回按 `code` 升序，前端可直接做多选
