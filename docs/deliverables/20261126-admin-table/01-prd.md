# 管理端数据表格（Table）PRD

## 1. 背景与目标

管理端用户/角色/租户/权限四个列表页目前是占位（`PlaceholderContent`），没有可用的数据表格。这些页面结构高度相似：搜索、筛选、表格、分页、批量操作、空/加载/错误态。逐页手写会重复且不一致。

Mantine 内置 `Table` 已提供 sticky header、`Table.ScrollContainer`、行选择、虚拟化示例；ui.mantine.dev 有 4 个现成表格组件（`TableSort` 搜索排序、`TableSelection` 行选择、`TableScrollArea` sticky 滚动、`TableReviews` 进度条）。按「复用官方现成组件、不引入第三方 DataTable」的约定，抽象一套统一的数据表格模式。

一句话目标：**定义一套可复用的管理端数据表格模式（搜索 + 筛选 + 排序 + 行选择 + 分页 + 状态表达），先以用户管理页落地样板，其余三页照搬。**

## 2. 用户与场景

- **管理端用户**：在列表页按关键词/状态找记录，点列头排序，勾选多行做批量操作，翻页浏览。
- **开发者**：新增列表页时复用统一的 `DataTable` 组件，只传列定义与数据源，不再重复写筛选栏/分页/状态。
- **当前替代方案**：占位页，无数据展示能力。

## 3. 范围

### 3.1 本期做

- F1 表格基础：Mantine `Table` + sticky header + `Table.ScrollContainer`
- F2 搜索与筛选：关键词搜索框 + 状态下拉筛选
- F3 排序：列头点击切换升序/降序/取消
- F4 行选择与批量操作：行 Checkbox + 全选 + 批量按钮（删除/启用/停用）
- F5 分页：`Pagination` 组件，页码/每页条数/总数
- F6 状态表达：加载（Skeleton）、空态（EmptyState）、错误态（Alert）+ 重试

### 3.2 明确不做（非目标）

- 不接真实后端 API（本期用静态数据验证 UI 模式；接口层留给后续需求）
- 不做详情页（用户此前澄清 DataList 不是目标）
- 不改 client / portal / 后端
- 不做列宽拖拽、列隐藏、虚拟滚动（数据量小，官方示例足够，后续按需）
- 不引入 `mantine-datatable` / `mantine-react-table` 等第三方库

### 3.3 依赖与假设

- admin 已有 Mantine 9（core/hooks）、Tabler 图标、`tailwind-preset-mantine`
- 表格组件遵循 `export const`、`index.tsx` barrel、目录化约定（见 conventions 第 7 节）
- 不需要 Docker/数据库；验证靠静态数据与浏览器展示

## 4. 功能清单

| 编号 | 功能 | 优先级 | 说明 |
| --- | --- | --- | --- |
| F1 | 表格基础 | P0 | sticky 表头 + 横向/纵向滚动容器 + 列定义 |
| F2 | 搜索与筛选 | P0 | 关键词输入 + 状态 Select，组合过滤 |
| F3 | 排序 | P1 | 列头点击切换排序方向，带箭头图标 |
| F4 | 行选择与批量操作 | P1 | 行 Checkbox、表头全选、ActionBar 固定底栏批量操作 |
| F5 | 分页 | P1 | Pagination + 每页条数 + 总数 |
| F6 | 状态表达 | P0 | 加载 / 空 / 错误 / 重试 |

## 5. 详细需求

### F1 表格基础

- 入口：`/access/users`（用户管理列表页）
- 表格用 Mantine `Table`，外层 `Table.ScrollContainer`（minWidth 按列数设定，maxHeight 限制高度）
- 表头 `stickyHeader`，列定义来自组件 props（列标题、渲染函数、可排序标记）
- 列：用户页含「选择 / 用户 / 邮箱 / 角色 / 状态 / 创建时间 / 操作」

### F2 搜索与筛选

- **术语**：筛选栏（FilterBar）只放搜索 / 筛选 / 重置；工具栏（页面操作区）放「新建 / 导入 / 导出」等操作按钮，位于 PageShell 的 actions 区
- 筛选栏左侧：`TextInput` 关键词搜索（placeholder「搜索用户…」），带搜索图标
- 筛选栏：`Select` 状态筛选（全部 / 正常 / 禁用）
- 搜索与筛选组合生效；输入即时过滤（前端静态数据）或点「搜索」触发（设计稿两种都描述，默认即时）
- 重置按钮：清空搜索词与筛选，恢复第一页

### F3 排序

- 可排序列头显示 `IconChevronUp` / `IconChevronDown` / 无箭头（三态）
- 点击列头：升序 → 降序 → 取消（回到默认顺序）
- 同一时刻只有一列处于排序态

### F4 行选择与批量操作

- 每行首列 Checkbox；表头 Checkbox 全选当前页
- 选中行高亮（背景色变化）
- 选中行后底部浮出 Mantine `ActionBar`（官方固定底栏组件），含「批量删除 / 批量启用 / 批量停用」；未选中任何行时不显示
- 全选状态：部分选中时表头 Checkbox 显示 indeterminate

### F5 分页

- 表格底部右侧 `Pagination`，显示当前页/总页数
- 左侧显示「共 N 条」与每页条数 `Select`（10 / 20 / 50）
- 切换每页条数时回到第一页

### F6 状态表达

- 加载：表格区域显示 `Skeleton` 行（保持列结构）
- 空态：`EmptyState` 组件，提示「暂无用户数据」，带「新建用户」按钮（占位）
- 错误态：`Alert` 红色，提示「加载失败」+「重试」按钮
- 状态互斥：同一时刻只显示一种（加载 / 空 / 错误 / 数据）

## 6. 验收标准

```
F1-AC1
Given 用户访问 /access/users
When  查看表格区域
Then  表头在滚动时保持可见（stickyHeader），列结构与列定义一致（7 列）

F2-AC1
Given 表格有 5 条用户数据，其中 2 条状态为「禁用」
When  在搜索框输入某用户邮箱片段
Then  表格只显示匹配的行，总数同步更新

F2-AC2
Given 状态筛选选择「禁用」
When  查看表格
Then  只显示 2 条禁用用户，搜索词仍生效（组合过滤）

F3-AC1
Given 表格按「创建时间」列头可排序
When  依次点击该列头两次
Then  第一次按时间升序、第二次降序，列头图标随之变化；第三次恢复默认顺序

F4-AC1
Given 当前页有 5 行
When  点击表头 Checkbox
Then  5 行全部选中并高亮，底部 ActionBar 出现；再次点击全部取消且 ActionBar 消失

F4-AC2
Given 选中 2 行
When  点击「批量删除」
Then  弹出确认提示（设计稿描述文案），确认后这 2 行从数据移除

F5-AC1
Given 共 25 条数据、每页 10 条
When  查看分页区
Then  显示「共 25 条」，分页共 3 页；点第 2 页显示第 11–20 条

F6-AC1
Given 数据加载中
When  查看表格区域
Then  显示 Skeleton 行，不显示空态或错误态

F6-AC2
Given 数据为空
When  查看表格区域
Then  显示 EmptyState「暂无用户数据」，不显示 Skeleton 或表格行
```

## 7. 非功能要求

- 复用 Mantine 官方组件（`Table`、`Pagination`、`Checkbox`、`Select`、`TextInput`、`EmptyState`、`ActionBar`、`Alert`、`Skeleton`），不手写交互逻辑
- 组件文件夹化 + `index.tsx` barrel，遵守 conventions 第 7 节
- 响应式：窄屏下表格横向滚动，筛选栏换行
- 无产品埋点（工程规范类）

## 8. 埋点与度量

本期为 UI 模式设计，无产品埋点。验证度量为：表格模式能否被三个列表页复用（列定义驱动）。

## 9. 待确认问题（已逐项确认）

| 编号 | 问题 | 结论 | 影响面 |
| --- | --- | --- | --- |
| Q1 | 本期落地页面 | 只做用户管理页作样板，其余三页后续照搬 | 范围 |
| Q2 | 搜索触发方式 | 即时过滤（前端静态数据） | 交互稿 |
| Q3 | 批量操作条形态 | Mantine `ActionBar` 固定底栏（选中行后出现） | 线稿布局 |
| Q4 | 每页条数默认值 | 10 | 分页默认值 |

## 10. 设计参照（clinic-desk data-list，仅理念）

**借鉴对象明确**：`D:\project\clinic-desk\apps\doctor\src\components\data-list\`——医生端统一数据列表底座。**不是** Mantine 的 `DataList` 描述列表组件，**也不是** ui.mantine.dev 的现成表格组件。只借鉴架构理念，**不照搬其自研组件代码**（本模板用 Mantine 组件库实现；clinic-desk 管理端自身也走 Mantine 原生路线）。

### 借鉴的架构分层

| data-list 层 | 职责 | 本需求落点 |
| --- | --- | --- |
| 纯逻辑 | 四态判定、数据抽取、筛选芯片 / 计数（纯函数，零 React / i18n / 业务类型） | `components/DataTable/functions.ts`：四态判定、分页推导、筛选芯片，纯函数可单测 |
| 状态 hook | 薄包装请求，请求 + 四态 + 分页 + 选中，对外吐统一结果 | `components/DataTable/useDataTable.ts`：本期静态数据，后续可接 TanStack Query |
| 布局组件 | Context + 组合组件，原子自由摆放，`Content` 内切四态 | `components/DataTable/`：`DataTable.tsx`（Root+Context）+ `DataTableFilterBar` / `DataTableContent` / `DataTablePagination` / `DataTableToolbar` / `DataTableCardList`，各含 `index.tsx` barrel |
| 配置层 | 业务只给「类型 + 字段 + 数据」，DOM / 交互 / 可访问性由组件生成 | `types.ts`（`FilterField` / 列定义）+ `filter-fields.ts` 配置，业务不写筛选表单 JSX |
| 文案映射 | 不 import i18n，业务把 `t` 传进来得到文案集合 | `components/DataTable/labels.ts` 常量，页面注入 |

### 三个零（沿用）

1. **零业务类型**：`useDataTable<TRow>` 泛型化，不 import `User` / `Role`
2. **零 i18n 耦合**：组件不 import i18n，文案走 `labels` 注入
3. **零后端结构假设**：四态判定 / 取数 / 取总数可注入，本期静态数据、后续接 API 不改组件

### 关键约定（沿用）

- 筛选配置化：`FilterField`（`select` / `text` / `segmented` / `dateRange` / `preset`），`placement` 区分 `inline` / `more` / `quick`
- 筛选区受控：不持有值、不发请求，`onChange` 回传完整值
- 页数单一来源：总页数只在一处推导，分页组件与翻页边界同源
- 双视图：桌面表格 + 移动卡片，一套配置两套 DOM
- 选中集合：`Set<string | number>` 通用主键

## 11. 组件命名（结合本项目）

按 `docs/guides/conventions.md` 第 7 节：PascalCase、文件名 = 组件名、目录化 + `index.tsx` barrel、hooks 用 `use` 前缀小驼峰。**不照搬 clinic-desk 的 `DataList` 系列名**：

| clinic-desk 自研名 | 本项目名 | 位置 |
| --- | --- | --- |
| `DataList`（Root） | `DataTable` | `components/DataTable/DataTable.tsx` |
| `DataList.Filters` | `DataTableFilterBar` | `components/DataTable/DataTableFilterBar.tsx` |
| `DataList.Toolbar`（计数插槽） | `DataTableToolbar`（本项目的工具栏放新建/导入/导出，计数单独显示） | `components/DataTable/DataTableToolbar.tsx` |
| `DataList.Content` | `DataTableContent` | `components/DataTable/DataTableContent.tsx` |
| `DataList.Pagination` | `DataTablePagination` | `components/DataTable/DataTablePagination.tsx` |
| （移动卡片视图） | `DataTableCardList` | `components/DataTable/DataTableCardList.tsx` |
| `useDataList` | `useDataTable` | `components/DataTable/useDataTable.ts` |
| `core.ts` / `filter-schema.ts` | `functions.ts` / `filter-fields.ts` | `components/DataTable/` |
| `labels.ts` | `labels.ts` | `components/DataTable/labels.ts` |

业务页只在 `features/access/users/UsersContent.tsx` 用列定义 + 筛选配置 + 数据拼装，不写四态分支；页面 `UsersPage.tsx` 仍用 `PageShell` 包一层（见 conventions 第 7 节「页面 = 壳 + 内容」）。
