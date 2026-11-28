# lib — 前端基础设施

## 职责

放与业务无关的全局工具：认证存储、API 客户端配置等。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `auth.ts` | token / 邮箱的本地存储与登录态判断 |
| `api-client.ts` | 配置 OpenAPI 生成客户端：baseUrl、Bearer 注入、401 跳登录 |
| `api-error.ts` | 从生成客户端错误体提取可展示的 message（string / string[]） |
| `me.tsx` | `MeProvider` / `useMe()`：加载 `/me`，提供平台管理员标记 |
| `permissions.tsx` | `TenantPermissionsProvider` / `usePermissions()`：加载指定租户的 membership 与权限并集 |
| `tenant.tsx` | `TenantProvider` / `useTenant()`：全局当前租户（持久化）；`GlobalTenantPermissions` 为当前租户挂权限 Provider |
| `menu-access.ts` | `useMenuAccess()`：导航菜单过滤（平台专属 / 租户权限点） |

## 注意事项

- `api-client.ts` 是**副作用模块**：在应用入口 `import "./lib/api-client"` 一次即可，不要重复导入。
- 401 跳转使用 `window.location`，避免依赖路由实例。
- 生产环境 token 建议放 httpOnly cookie；当前模板用 localStorage 便于演示。
