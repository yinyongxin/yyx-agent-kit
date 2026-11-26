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
| `DataTableToolbar.tsx` | 工具栏（新建 / 导入 / 导出等页面操作） |
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
