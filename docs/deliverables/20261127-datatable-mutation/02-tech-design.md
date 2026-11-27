# DataTable 新增/编辑抽屉后的列表更新策略 — 技术方案

> 小需求裁剪：改 `useDataTable` + 类型 + README，合并阶段 1+2。

## 1. 需求与验收标准

**目标**：抽屉（新增/编辑）关闭后，底座提供统一的列表更新入口，按「精准更新 / 回第一页刷新」策略处理，并自动规避「改了排序/筛选字段导致显示错误」的坑。

| 编号 | 验收标准 |
| --- | --- |
| AC1 | `applyMutation({ row, mode })` 后，编辑默认行内替换该行，页面/滚动位置不变 |
| AC2 | 编辑时若修改了 `sortKey` 或任一筛选字段的值，自动降级为刷新（不再精准替换） |
| AC3 | 新增默认回第一页 + 刷新，并触发 `onMutated` 提示 |
| AC4 | 抽屉提交返回落库后的完整行，精准更新直接使用，不额外请求 |
| AC5 | 客户端/服务端两种模式都支持；服务端刷新走 `reload()` |
| AC6 | 业务可覆盖默认策略 |
| AC7 | typecheck / lint 通过 |

## 2. 类型设计

```ts
type MutationMode = "create" | "edit";
type RefreshStrategy = "precise" | "refresh" | "refresh-first";

interface MutationResult<TRow> {
  row: TRow;                 // 落库后的完整行
  mode: MutationMode;
}

interface MutationConfig<TRow> {
  /** 覆盖默认策略；也可传函数按 result 动态决定 */
  strategy?: RefreshStrategy | ((result: MutationResult<TRow>) => RefreshStrategy);
  /** 变更完成后的提示（如「已创建，已跳转到第一页」） */
  onMutated?: (result: MutationResult<TRow>, strategy: RefreshStrategy) => void;
}
```

## 3. 默认策略

| mode | 默认策略 | 原因 |
| --- | --- | --- |
| `edit` | `precise` | 保分页/滚动、不闪烁；但若改了排序/筛选字段 → 自动降级 `refresh` |
| `create` | `refresh-first` | 新行位置取决于排序/筛选/分页，精准插入可能看不到；回第一页保证可见 |

**自动降级判定**：比较提交前后行在 `sortKey` 与各 `filterFields.key` 上的值，任一不同即视为「影响排序/筛选」→ 从 `precise` 降级为 `refresh`。

## 4. 两种模式的实现

| 模式 | precise | refresh / refresh-first |
| --- | --- | --- |
| 客户端 | 用 `row` 替换/插入内部数据（按 `getRowKey` 定位） | 重算（数据已在内存）；`refresh-first` 先 `setPage(1)` |
| 服务端 | 用 `row` 替换/插入 `serverData`；`total` 同步 ±1 | 调 `reload()`；`refresh-first` 先 `setPage(1)`（effect 会用新页码拉） |

> 客户端模式当前 `data = serverMode ? serverData : propData`。为支持精准更新，加一个内部 `clientOverride: TRow[] | null`，precise 时设置它，`data` 优先取它；刷新/重置时清空回到 `propData`。这样不破坏现有「父组件传 data」的用法。

## 5. 对外 API

`useDataTable` 返回值新增：
- `applyMutation(result: MutationResult<TRow>): void` —— 按配置策略处理
- `mutationConfig` 从 options 注入（可选）

`DataTableApi<TRow>` 同步扩展。

## 6. 文件

| 文件 | 改动 |
| --- | --- |
| `types.ts` | 加 `MutationMode` / `RefreshStrategy` / `MutationResult` / `MutationConfig` |
| `useDataTable.ts` | 加 `clientOverride` / `applyMutation` / 自动降级判定 / 两种模式分支 |
| `README.md` | 补「抽屉更新策略」一节 |
| `docs/CHANGELOG.md` | 记录 |

## 7. 风险

- 自动降级需要提交前的旧行；编辑抽屉必须把原行传给 `applyMutation`（`previousRow` 字段），否则无法判定 → 类型里加 `previous?: TRow`
- 服务端模式精准插入后 `total` 是前端估算的，若后端总数规则复杂（如权限过滤）可能不准 → `refresh` 策略可纠正，文档说明
- `refresh-first` 回第一页后 effect 触发拉取，注意页码 state 更新与 effect 的时序
