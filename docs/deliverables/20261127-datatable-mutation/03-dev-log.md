# DataTable 抽屉更新策略 — 开发日志

## 改动

| 文件 | 改动 |
| --- | --- |
| `types.ts` | 加 `MutationMode` / `RefreshStrategy` / `MutationResult` / `MutationConfig` |
| `useDataTable.ts` | 加 `clientOverride`（客户端精准更新覆盖层）、`applyMutation`、自动降级判定、`reloadNonce`（避免重复拉取）；options 加 `mutationConfig` |
| `README.md` | 补「抽屉变更后的列表更新」一节 |
| 技术方案 | `02-tech-design.md` |

## 策略实现

- `edit` 默认 `precise`：按 `getRowKey` 定位替换/插入；若 `previous` 与 `row` 在 `sortKey` 或筛选字段上的值不同 → 自动降级 `refresh`
- `create` 默认 `refresh-first`：回第一页 + 刷新 + `onMutated` 提示
- 可覆盖：`mutationConfig.strategy` 支持值或函数
- 客户端 precise 用 `clientOverride`（null 时回到 propData）；服务端 precise 改 `serverData`
- refresh 走 `reloadNonce` 触发 effect，避免与页码变化的 effect 重复拉取

## 验证

- `typecheck` / `lint` 通过（仅既有 Fast Refresh warning）
- 浏览器回归（客户端模式）：用户页仍 25 条 / 每页 10 行、搜索过滤正常（此为兼容验证；抽屉当前无页面接入，精准更新/降级逻辑未做页面实测）

## 遗留

- 当前无抽屉页面接入 `applyMutation`，精准更新与自动降级仅代码层实现，待真正的新增/编辑抽屉需求补页面实测
- 服务端模式精准插入后 `total` 为前端估算，复杂总数规则以 `refresh` 为准
