# components/DataTable — 管理端通用数据表格底座

## 职责

借鉴 clinic-desk `components/data-list` 的分层理念，用 Mantine 组件库实现的可复用表格底座。业务页只提供列定义、筛选配置与数据；四态、分页、选中、双视图由底座统一处理。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `index.tsx` | barrel，只 re-export，不写逻辑 |
| `DataTable.tsx` | Root + Context + `useDataTableContext` |
| `DataTableFilterBar.tsx` | 筛选栏（搜索 / 筛选 / 重置），配置驱动、受控 |
| `DataTableContent.tsx` | 四态切换 + `emptyWhen` + 空态动作按钮 |
| `DataTableTable.tsx` | 桌面表格视图（sticky 表头 + 行选择 + 可聚焦排序按钮） |
| `DataTableCardList.tsx` | 移动卡片视图（一份配置两套 DOM） |
| `DataTablePagination.tsx` | 分页 + 每页条数，页数读 Context 单一来源 |
| `DataTableToolbar.tsx` | 工具栏（新建 / 导入 / 导出等页面操作） |
| `useDataTable.ts` | 状态 hook：四态 + 过滤排序分页 + 选中，泛型靠 `getRowKey` 推断 |
| `functions.ts` | 纯逻辑：四态判定 / 过滤 / 排序 / 分页推导 / 选中切换 / 筛选芯片 |
| `filter-fields.ts` | `FilterField` 配置构造 |
| `types.ts` | 列定义 / 筛选字段 / Context 类型 |
| `labels.ts` | 文案常量（不 import i18n，由业务注入） |

## 关联

- 设计依据：`docs/deliverables/20261126-admin-table/` 的 PRD 三件套 + 技术方案
- 命名与目录约定：`docs/guides/conventions.md` 第 7 节（PascalCase、目录化 + barrel、页面 = 壳 + 内容）
- 首个样板：`features/access/users/UsersContent.tsx`；页面壳 `UsersPage.tsx` 仍用 `PageShell`
- 依赖 Mantine 原生组件（`Table` / `Checkbox` / `UnstyledButton` / `ActionBar` / `EmptyState` / `Pagination` 等），不引入第三方 DataTable

## 同步要求

- 新增 / 改名文件必须同步更新本 README 与 `index.tsx` barrel
- 组件名遵循 PascalCase + 文件名 = 组件名；hooks 用 `use` 前缀小驼峰
- 不 import 业务类型、不 import i18n；文案走 `labels` 注入
- 页数只在 `functions.ts` 推导一处，分页组件与翻页边界共用，杜绝死按钮
