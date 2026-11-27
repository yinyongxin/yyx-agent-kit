# DataTable 服务端接入 + 四态驱动 — 开发日志

## 改动

| 文件 | 改动 |
| --- | --- |
| `types.ts` | 加 `QueryContext` / `QueryOptions` 类型 |
| `useDataTable.ts` | 加 `queryOptions` / `serverMode` / `setLoading` / `setError` / `reload` / `setData` / `errorMessage`；内部 state 驱动四态；客户端模式用派生值避免 effect 内 setState |
| `DataTableContent.tsx` | 错误态优先显示 `errorMessage`（服务端 setError 的具体原因） |
| `README.md` | 补两种模式说明 |

## 两种模式

- 客户端（默认）：不传 `queryOptions`，`data` 来自 prop，前端过滤/排序/分页，行为与改动前完全一致。
- 服务端：传 `queryOptions(ctx)`，hook 在页码/搜索/筛选/排序变化时调用它；业务在其中发请求并 `setLoading` / `setError` / `setData` 驱动四态；前端不再二次处理数据。

## 验证

- `typecheck` / `lint` 通过（消除了 `set-state-in-effect` warning：客户端模式改为派生值 `serverMode ? serverData : propData`）。
- ego-browser 客户端模式回归：用户页 25 条 / 每页 10 行；搜索 `user3` → 1 条、user2 消失，与改动前一致。

## 遗留

- 服务端模式当前无页面使用，只做了类型层验证，未浏览器实测；后续接真实 API 的需求应补一个服务端模式页面验证 `queryOptions` 触发与四态切换。
- 服务端模式的 `total` 来自 `data.length`，需业务保证后端返回的是当前页数据且总数另行维护（后续可加 `total` prop 覆盖）。
