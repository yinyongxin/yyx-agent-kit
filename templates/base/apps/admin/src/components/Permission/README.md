# Permission

## 职责

前端权限展示层收口，真正的授权仍以后端 403 为准。

| 组件 | 场景 | 数据来源 |
| --- | --- | --- |
| `Can` | 按钮 / 操作项显隐 | `TenantPermissionsProvider` |
| `PermissionGate` | 租户页面级门禁（无权限渲染 403） | `TenantPermissionsProvider` |
| `PlatformAdminGate` | 平台页面级门禁 | `/me` 的 `isPlatformAdmin` |

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `Permission.tsx` | `Can` / `PermissionGate` / `PlatformAdminGate` |
| `index.tsx` | barrel，只 re-export |

## 用法

```tsx
<TenantPermissionsProvider tenantId={tenantId}>
  <PermissionGate permission="user:read">
    <TenantMembersContent tenantId={tenantId} />
  </PermissionGate>
</TenantPermissionsProvider>

<Can permission="user:write">
  <Button>添加成员</Button>
</Can>
```

## 注意事项

- `Can` 在权限加载完成前渲染 `fallback`（默认隐藏），避免按钮闪现
- `PermissionGate` 加载失败显示 403，而不是空白页
- `owner` / `admin` 的权限为 `["*"]`，`can()` 会直接放行
- 只做展示层收口，不能替代后端 `@RequirePermission`
