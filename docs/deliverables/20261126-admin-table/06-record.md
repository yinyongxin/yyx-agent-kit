# 管理端数据表格（Table）交付记录

## 概览

- 状态：已交付
- 周期：2026-11-26
- 参与角色：chief（产品设计 + 技术方案）、coder（主会话实施）、qa（独立回归两轮）、archivist

## 需求背景

用户提出「管理端 DataList 设计」，经多轮澄清确认：**不是** Mantine 的 `DataList` 描述列表组件，也**不是**单纯表格样式，而是要借鉴 clinic-desk 医生端 `components/data-list` 底座的架构理念，做管理端可复用的数据表格列表页，先以用户管理页落地样板。最初诉求与最终范围差异：从「详情页字段展示」误读，收敛为「列表页数据表格 + 统一底座」。

## 关键决策（ADR）

### ADR-1 借鉴 data-list 架构，用 Mantine 落地

- 背景：用户明确「借鉴的是 data-list，只用参考设计理念不用参考代码实现，因为当前项目还是用了组件库的」
- 选项：A 照搬 clinic-desk 自研 `DataList` / B 借鉴四层架构理念 + Mantine 组件库实现
- 结论：选 B
- 理由：clinic-desk 管理端自身也走 Mantine 原生路线；架构理念（纯逻辑 / hook / 组合组件 / 配置层 / 文案映射）可迁移，自研代码不可迁移
- 影响：`components/DataTable/` 四层结构；不引入 `mantine-datatable`
- 状态：有效

### ADR-2 组件名按本项目规范重设计

- 背景：首版组件名照搬 clinic-desk 的 `DataList` 系列名，用户指出「组件名你根据结合项目来设计」
- 选项：A 沿用 `DataList.Filters` 等 / B 按 conventions 第 7 节重命名为 `DataTable` 系列
- 结论：选 B：`DataTableFilterBar`（筛选栏）/ `DataTableToolbar`（工具栏）/ `DataTableContent` / `DataTableCardList` / `useDataTable` 等
- 理由：PascalCase、文件名=组件名、目录化 + barrel、hooks 用 `use` 前缀；且厘清「筛选栏放搜索过滤、工具栏放新建操作」的术语边界
- 影响：PRD 第 11 节命名映射表；所有组件目录
- 状态：有效

### ADR-3 双视图企划

- 背景：用户问「两种视图企划你有感知到吗」
- 结论：桌面 `DataTableTable`（Mantine Table，列定义驱动）+ 移动 `DataTableCardList`（卡片列表），一份配置两套 DOM、CSS 断点切换、面板状态不跨断点共享
- 理由：clinic-desk data-list 的成熟模式；移动端避免横向滚动
- 状态：有效

### ADR-4 筛选栏与工具栏术语分离

- 背景：我最初把搜索那一行叫「工具栏」，用户纠正「工具栏是放新建等按钮的地方」
- 结论：搜索/筛选/重置 → 筛选栏（FilterBar）；新建/导入/导出 → 工具栏（Toolbar，位于 PageShell actions 区）
- 影响：三件套全部改正；避免后续三个列表页照抄错术语
- 状态：有效

### ADR-5 空态用过滤后数据判定

- 背景：qa 首轮抓到 P1 缺陷 D-01——搜索无匹配时显示空白表格而非 EmptyState
- 结论：`useDataTable` 的 `resolveState` 改用过滤后的 `allRows` 判空，而非原始 `data`
- 理由：原始 data 恒为 25 条，导致「过滤后 0 行」永远进不了空态；修复后 F2/F6 验收通过
- 状态：有效

## 交付物

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| PRD 三件套 | `01-prd.md`、`01-wireframe.md`、`01-interaction.md` | F1–F6 + Q1–Q4 + data-list 理念 + 组件命名 |
| 技术方案 | `02-tech-design.md` | 四层架构、14 文件改动面、6 任务拆分 |
| 开发日志 | `03-dev-log.md` | 9 个类型错误、列宽修复、缺陷修复记录 |
| 测试计划 / 报告 | `05-test-plan.md`、`05-test-report.md` | 首轮 36/43 不通过 → 复测 43/43 通过 |
| DataTable 组件 | `templates/base/apps/admin/src/components/DataTable/`（14 文件含 README） | 四层底座 + 双视图 + barrel |
| 用户页样板 | `templates/base/apps/admin/src/features/access/users/UsersContent.tsx` | 占位 → 25 条静态数据列表 |

## 验证结论

qa 独立回归两轮：首轮 36/43（1 个 P1 + 5 个 P2 + 1 个 P3，结论「不通过」）；修复 D-01~D-07 后复测 **43/43 通过、0 缺陷、0 阻塞**，报告结论改为「通过」。`typecheck` / `lint` exit 0。浏览器验证覆盖搜索、筛选、排序、分页、行选择、ActionBar 批量操作、双视图、键盘可达、空态。

## 遗留与风险

| 项 | 影响 | 建议处理时机 |
| --- | --- | --- |
| 全量 `pnpm build` 因本机 Rolldown OOM 未跑 | 构建产物未在本机最终确认 | 高内存环境重跑 |
| loading/error 态无页面注入入口 | 仅静态确认，未页面实测 | 接真实 API 时补测 |
| 角色/租户/权限页仍占位 | 其余三页未复用本模式 | 按业务优先级照搬 |
| 后端 API / 鉴权 / 数据库 | 本期静态数据，不接真实数据 | 后续需求 |

## 下次接手

先读 `templates/base/apps/admin/src/components/DataTable/README.md`（文件索引与同步要求）和本文 ADR；新增列表页只需在 `features/<域>/` 写列定义 + 筛选配置 + 数据，页面壳用 `PageShell`。改组件名或目录时同步 barrel 与 README。
