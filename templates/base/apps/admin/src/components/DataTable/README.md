# components/DataTable — 管理端通用数据表格底座

## 职责

Headless 表格底座：状态与配置集中在 `useDataTable` 返回的实例里，视图组件是纯组件、显式接收实例；Provider 只传值不渲染 DOM。四态、分页、选中、双视图、批量操作由底座统一处理。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `index.tsx` | barrel，只 re-export，不写逻辑 |
| `DataTable.tsx` | 纯 Provider（无 DOM）+ `useDataTableApi` 解析入口 |
| `DataTableFilterBar.tsx` | 筛选栏（搜索 / 筛选 / 重置），配置驱动、受控 |
| `DataTableContent.tsx` | 四态切换 + `emptyWhen` + 空态动作按钮 |
| `DataTableTable.tsx` | 桌面表格视图（sticky 表头 + 行选择 + 可聚焦排序按钮） |
| `DataTableCardList.tsx` | 移动卡片视图（一份配置两套 DOM） |
| `DataTablePagination.tsx` | 分页 + 每页条数，页数读实例单一来源 |
| `DataTableToolbar.tsx` | 工具栏（新建 / 导入 / 导出等页面操作；**不要放刷新按钮**，搜索/筛选即刷新） |
| `DataTableBatchBar.tsx` | 批量操作条（ActionBar + 确认弹窗），业务只给动作清单 |
| `useDataTable.ts` | 控制器：状态 + 配置 → `DataTableApi<TRow>`，泛型靠 `getRowKey` 推断 |
| `functions.ts` | 纯逻辑：四态判定 / 过滤 / 排序 / 分页推导 / 选中切换 / 筛选芯片 |
| `filter-fields.ts` | 通用 `selectField()` 构造，不认识具体业务字段 |
| `types.ts` | 列定义 / 筛选字段 / 批量动作 / 文案类型 |
| `labels.ts` | 中性默认文案（不 import i18n；业务页应注入自己的 labels） |

## 用法

```tsx
const table = useDataTable({
  data,
  getRowKey: (row: Row) => row.id,
  keywordFields: ["name", "email"],
  columns,
  filterFields,
  labels,
  paginationLabels,
});

// 方式 A：显式 props —— 类型从 table 推断，完全不需要 Provider
<DataTableFilterBar table={table} />
<DataTableContent table={table}>
  <DataTableTable table={table} />
</DataTableContent>

// 方式 B：纯 Provider —— 只传值、不渲染 DOM，组合位置自由
<DataTableProvider table={table}>
  <DataTableFilterBar />
  <DataTableTable />
</DataTableProvider>
```

`useDataTableApi(tableProp?)` 先取显式 prop，没传才读 Provider；所以「必须在 Provider 内部」不是硬约束。**但放在 Provider 外面的组件必须显式传 `table`**——因为 prop 是可选的，typecheck 抓不到漏传，运行时才会报错。

### 选择列 / 操作列按需显示

- 行选择列默认**不显示**；只有需要批量操作的表才在 `useDataTable` 传 `selectable: true`（当前为成员、用户、文件）。
- `DataTableBatchBar` 在 `selectable=false` 或 `actions` 为空时直接不渲染。
- 操作列是业务列：没有操作能力时给对应 `ColumnDef` 设 `hidden: true`，表格与卡片视图都会跳过该列；不要固定渲染一列「—」。
- 这样只读账号不会看到勾选框和空操作列。



| 模式 | 触发 | 使用场景 | 数据 / 过滤 |
| --- | --- | --- | --- |
| **服务端（默认）** | 传 `queryOptions(ctx)` | 生产页面 | 业务发请求后 `setData` + `setTotal` 喂回；搜索/筛选/排序/分页走后端 |
| 客户端（仅演示） | 不传 `queryOptions` | mock / 小数据一次性加载 | `data` prop；`functions.ts` 前端处理 |

服务端模式下，hook 在页码/搜索/筛选/排序变化时调用 `queryOptions({page, pageSize, keyword, filters, sortKey, sortDirection})`；业务在其中发请求，并用 `setLoading` / `setError` / `setData` / `setTotal` 驱动四态与分页。`queryOptions` **必须用 `useCallback` 稳定引用**，否则 `reload` 每次渲染变化会触发 effect 无限请求。`reload()` 可用当前条件手动重拉。

搜索为**提交式**：输入只改草稿，点「搜索」/回车才提交并请求；客户端模式下则是提交后前端过滤。

### 抽屉变更后的列表更新

`applyMutation({ row, mode, previous? })` 是新增/编辑抽屉提交后的统一入口：

| mode | 默认策略 | 说明 |
| --- | --- | --- |
| `edit` | `precise` | 按主键行内替换，保分页/滚动；若 `previous` 与 `row` 在排序字段或筛选字段上的值不同，自动降级为 `refresh` |
| `create` | `refresh-first` | 回第一页 + 刷新，保证新行可见；触发 `onMutated` 提示 |

策略可通过 `mutationConfig.strategy`（值或函数）覆盖；`mutationConfig.onMutated(result, strategy)` 用于业务提示。客户端模式 precise 用内部覆盖层（不破坏父组件传 data），refresh 清覆盖回到数据源；服务端模式 precise 改 `serverData`，refresh 走 nonce 触发 effect 拉取（避免与页码变化重复请求）。

### 更多筛选的草稿态

more 字段收进「更多筛选」浮层，采用草稿态：打开时快照当前已提交的 more 值，浮层内改动只影响草稿（列表/芯片/角标不变），点「应用筛选」才通过 `applyFilters(draft)` 一次性提交（服务端模式只拉一次），点「取消」丢弃草稿。inline 条件与关键词仍即时生效，草稿只管 more 字段。

## 关联

- 设计依据：`docs/deliverables/20261126-admin-table/` 的 PRD 三件套 + 技术方案
- 命名与目录约定：`docs/guides/conventions.md` 第 7 节（PascalCase、目录化 + barrel、页面 = 壳 + 内容）
- 首个样板：`features/access/users/UsersContent.tsx`；页面壳 `UsersPage.tsx` 仍用 `PageShell`
- 依赖 Mantine 原生组件（`Table` / `Checkbox` / `UnstyledButton` / `ActionBar` / `EmptyState` / `Pagination` 等），不引入第三方 DataTable

## 同步要求

- 新增 / 改名文件必须同步更新本 README 与 `index.tsx` barrel
- 组件名遵循 PascalCase + 文件名 = 组件名；hooks 用 `use` 前缀小驼峰
- 不 import 业务类型、不 import i18n；底座只给中性默认文案，业务页注入自己的 `labels`（见 `UsersContent.tsx`）
- 筛选字段当前只实现 `select`；未实现的类型不要加进 `FilterFieldType`，避免「配了没效果」
- 排序按列值类型处理：数字走数值比较，其余走中文字符串比较
- 页数只在 `functions.ts` 推导一处，分页组件与翻页边界共用，杜绝死按钮；空态动作没接好时不要传 `onEmptyAction`
- 批量操作统一走 `DataTableBatchBar`：业务只提供 `DataTableBatchAction[]`（含真正改数据的 `run`），不在页面里自己拼 ActionBar + Modal；`confirm` 传了才弹确认框
