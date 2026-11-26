# 20261126-admin-table

## 职责

管理端数据表格（Table）列表页模式设计：搜索 / 筛选 / 排序 / 行选择 / 分页 / 状态表达，先以用户管理页作样板。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `01-prd.md` | F1–F6 功能清单、详细需求、Given/When/Then 验收标准 |
| `01-wireframe.md` | 页面结构、组件树、列定义、四态视图、响应式 |
| `01-interaction.md` | 主流程、状态机、交互明细、边界与文案、无障碍 |

## 关联

- 复用 Mantine 内置 `Table`；架构理念借鉴 clinic-desk `components/data-list`（不照搬代码），不引入第三方 DataTable（见 `01-prd.md` 非目标与第 10、11 节）。
- 组件与目录约定见 `../../guides/conventions.md` 第 7 节（admin 目录结构、组件文件夹化 + barrel）。
- 索引条目在 `../../README.md`「需求索引」。

## 同步要求

阶段 1 设计稿；每道门禁通过后更新 `../../README.md` 需求索引。功能编号 F1–F6 在三份文档间保持稳定，改动需同步全文。
