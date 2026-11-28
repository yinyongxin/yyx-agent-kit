# ForbiddenContent

## 职责

统一 403 内容块：无权限访问租户页面或平台页面时，放在 `PageShell` 的 children 里展示，保留页面标题与导航。提供「返回工作台」按钮。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `ForbiddenContent.tsx` | 403 卡片；可选 `description` 覆盖默认文案 |
| `index.tsx` | barrel，只 re-export |

## 关联

- `components/Permission/`：`PermissionGate` / `PlatformAdminGate` 在无权限时渲染本组件
