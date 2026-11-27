# DataTable 服务端接入 + 四态驱动 — 技术方案

> 小需求裁剪：无新页面，改 `useDataTable` 一个 hook + 类型 + 业务页示范，合并阶段 1+2。

## 1. 需求与验收标准

**目标**：给 `useDataTable` 加服务端数据注入点和四态驱动动作，让接真实 API 时不用改 hook；静态数据用法保持兼容。

| 编号 | 验收标准 |
| --- | --- |
| AC1 | 不传 `queryOptions` 时行为与现在完全一致（前端过滤/排序/分页、静态数据） |
| AC2 | 传 `queryOptions({page, pageSize, keyword, filters, sortKey, sortDirection})` 后，hook 在条件变化时调用它拉取，`data` 由业务按返回值提供 |
| AC3 | hook 对外暴露 `setLoading` / `setError` / `reload`，`DataTableContent` 能据此显示 Skeleton / Alert |
| AC4 | 服务端模式下过滤/排序/分页由后端做，前端不再对 `data` 二次过滤（由 `serverMode` 标记控制） |
| AC5 | 分页 / 搜索 / 排序 / 筛选变化触发重新拉取，页码回退逻辑不变 |
| AC6 | `typecheck` / `lint` 通过，用户页仍正常 |

## 2. 设计

### 2.1 两种模式

| 模式 | 触发 | 数据来源 | 过滤/排序/分页 |
| --- | --- | --- | --- |
| 客户端（默认） | 不传 `queryOptions` | `data` prop | `functions.ts` 前端处理 |
| 服务端 | 传 `queryOptions` | 业务把请求结果放进 `data` | 后端处理，前端直接展示 |

`serverMode = Boolean(queryOptions)`。

### 2.2 新增类型

```ts
interface QueryContext<TRow> {
  page: number;
  pageSize: number;
  keyword: string;
  filters: FilterValues;
  sortKey: keyof TRow & string | null;
  sortDirection: SortDirection;
}
type QueryOptions<TRow> = (ctx: QueryContext<TRow>) => void | Promise<void>;
```

`queryOptions` 是回调而非请求本身：hook 在条件变化时调用它，业务在里面发请求并 `setData` / `setLoading` / `setError`。

### 2.3 新增动作（对外 API）

- `setLoading(loading: boolean)` / `setError(message?: string)`：驱动四态
- `reload()`：用当前条件重新调用 `queryOptions`
- `state` 改为内部 state（`loading` / `success` / `error` / `empty`），由 `setLoading` / `setError` 和数据共同决定；客户端模式沿用 `resolveState` 推导

### 2.4 触发拉取的时机

`page` / `pageSize` / `keyword` / `filters` / `sortKey` / `sortDirection` 变化时，若 `serverMode` 则 `reload()`。用 `useEffect` 监听，首次挂载也拉一次。

### 2.5 兼容

- 客户端模式：`data` 仍来自 prop，`state` 由 `resolveState` 推导，`reload` 为 no-op（或仅调 `onSearch`）
- 服务端模式：`data` 由业务 `setData` 提供；`serverMode` 下 `allRows` 直接等于 `data`，不再 `filterRows` / `sortRows` / `paginateRows`

## 3. 文件

| 文件 | 改动 |
| --- | --- |
| `types.ts` | 加 `QueryContext` / `QueryOptions` |
| `useDataTable.ts` | 加 `queryOptions` / `serverMode` / `setLoading` / `setError` / `reload` / 内部 state |
| `DataTableContent.tsx` | 不改（已按 state 切四态） |
| `UsersContent.tsx` | 不改（客户端模式示范保持） |
| `README.md` | 补两种模式说明 |

## 4. 风险

- 服务端模式前端不再过滤，需确保后端返回已分页数据 + total；total 来源需约定（响应字段）
- `useEffect` 依赖多，注意避免无限循环（`queryOptions` 用 `useCallback` 稳定引用）
