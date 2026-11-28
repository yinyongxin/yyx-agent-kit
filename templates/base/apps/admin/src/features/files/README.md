# features/files

| 文件 | 作用 |
| --- | --- |
| `FilesPage.tsx` | 页面壳 + `PermissionGate(file:read)` |
| `FilesContent.tsx` | 服务端模式表格、上传（FileButton）、下载（blob）、删除、批量删除 |
| `index.tsx` | barrel，仅 re-export |

- 租户来自全局 `useTenant()`；切换租户后列表自动重查
- 下载走后端鉴权接口，前端用 `parseAs: "blob"` 再触发保存，避免 `<a href>` 丢失 Bearer token
- 上传/删除按钮用 `<Can permission="file:write">` 做展示收口；后端仍由 `@RequirePermission` 拦截
- 接口变化后运行 `pnpm api:generate`
