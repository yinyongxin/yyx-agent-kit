# tenants/members — 平台级租户成员管理

## 职责

`TenantsModule` 的平台级成员接口（`/tenants/:tenantId/members`），用于跨租户引导/恢复，不要求操作者是租户成员。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `platform-members.controller.ts` | `PlatformTenantMembersController`：列表 / 添加 / 更新 / 移除 |
| `platform-members.service.ts` | `PlatformMembersService`：复用 `tenancy/members` 的 `MembersService`，开启最后管理员保护 |

## 说明

- 不是独立 Nest 子模块，controller/service 由 `TenantsModule` 注册
- 读操作要求任意平台管理员；写操作要求 `super`
- 成员查询/写入逻辑不复制，统一复用 `tenancy/members`
- 审计动作：`platform.member.create/update/delete`
