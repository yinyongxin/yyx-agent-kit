# tenancy/members/repositories

## 职责

租户成员数据访问（`MembersRepository`）。

## 约束

- `UserTenant` / `User` 是全局表，查询显式带 `tenantId`
- `UserRole` 通过 `role.tenantId` 收窄
- 方法接收 `Prisma.TransactionClient`，由 controller 的 `@TenantTx()` 注入
