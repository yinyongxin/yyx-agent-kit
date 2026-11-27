# 更多筛选草稿态 — 技术方案

> 小需求裁剪：改 `DataTableFilterBar` + `useDataTable` 的批量筛选 API，合并阶段 1+2。

## 1. 需求与验收

**目标**：更多筛选浮层改为草稿态——打开时快照当前值，浮层内改动只影响草稿，点「应用」才提交到列表并刷新，点「取消」丢弃草稿。避免服务端模式连续改条件触发多次请求，也避免「改到一半反悔」的中间态。

| 编号 | 验收 |
| --- | --- |
| AC1 | 打开浮层时，浮层内 Select 显示当前已应用的 more 筛选值 |
| AC2 | 浮层内改动 Select，列表/芯片/角标不变（草稿未提交） |
| AC3 | 点「应用」后，草稿一次性提交，列表过滤更新、芯片/角标更新；服务端模式只触发一次拉取 |
| AC4 | 点「取消」后，浮层关闭，草稿丢弃，列表/芯片不变 |
| AC5 | inline 筛选与关键词仍即时生效（草稿只管 more 字段） |
| AC6 | 外部重置按钮清空已提交的 more 筛选；下次打开浮层显示空草稿 |
| AC7 | typecheck / lint 通过，浏览器验证草稿态流程 |

## 2. 设计

### 2.1 草稿状态放在 UI 层

草稿是浮层的 UI 概念，放 `DataTableFilterBar` 内部 state，不污染 `useDataTable`：

```ts
const [opened, { open, close }] = useDisclosure(false);
const [draft, setDraft] = useState<FilterValues>({});
```

- 打开浮层：`setDraft(pickMoreFilters(filters, moreFields)); open()`
- 浮层内 Select：读 `draft[key]`，写 `setDraft(prev => ({...prev, [key]: value}))`
- 应用：`applyFilters(draft); close()`
- 取消：`close()`（不提交）

### 2.2 hook 加批量 API `applyFilters(partial)`

现有 `setFilter(key, value)` 是单个的，服务端模式每调一次就触发一次拉取。新增：

```ts
applyFilters: (partial: FilterValues) => void;  // 一次性合并多个筛选值，回第一页，服务端只拉一次
```

实现：`setFilters(prev => ({...prev, ...partial}))` + `setPageRaw(1)`；服务端模式走 `requestReload()` 一次。

### 2.3 受控 Popover

Popover 改用受控 `opened` + `onChange`，配合 `open`/`close`。浮层内 Select 保持 `comboboxProps={{ withinPortal: false }}`（嵌套规则）。

### 2.4 文案

`DataTableLabels` 加 `applyFilters: string` / `cancelFilters: string`（中性默认「应用筛选」「取消」），业务页可覆盖。

## 3. 文件

| 文件 | 改动 |
| --- | --- |
| `types.ts` | labels 加 `applyFilters` / `cancelFilters` |
| `labels.ts` | 补默认文案 |
| `useDataTable.ts` | result 加 `applyFilters`，实现批量合并 |
| `DataTableFilterBar.tsx` | 草稿 state、受控 Popover、应用/取消按钮 |
| `UsersContent.tsx` | 补文案覆盖（可选） |
| `README.md` | 补草稿态说明 |

## 4. 风险

- 打开浮层快照的时机：若外部筛选在浮层打开期间变化（如重置），草稿应同步——打开时快照即可，期间变化概率低，可接受
- 服务端模式「应用」后 `applyFilters` 改 filters → queryCtx 变 → effect 拉取一次；同时 `applyFilters` 内部不应再手动 `requestReload()`，避免重复——让 effect 统一处理
