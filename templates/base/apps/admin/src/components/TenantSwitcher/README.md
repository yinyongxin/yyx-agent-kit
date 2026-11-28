# TenantSwitcher

## 职责

全局当前租户切换器。数据来自 `TenantProvider`（`/me/tenants`），切换后写入 `localStorage` 并触发全局权限 Provider 重新加载。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `TenantSwitcher.tsx` | 租户下拉；`withLabel` 控制是否显示「当前租户」标签 |
| `index.tsx` | barrel，只 re-export |

## 使用位置

- 四种菜单的 `UserMenu` 用户信息面板内，`withLabel` 显示「当前租户」标签
- 不再放在侧栏品牌行或双栏子菜单顶部

## 注意

- 租户成员页（`/access/tenant-members/:tenantId`）的租户来自路由，切换器在该页隐藏
- 只负责切换全局租户，不负责跳转页面；角色页、成员页、文件页会随当前租户自动刷新
