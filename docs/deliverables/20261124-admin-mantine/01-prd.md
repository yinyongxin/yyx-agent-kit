# 管理端引入 Mantine 组件库 PRD

## 1. 背景与目标

`apps/admin` 目前用 Tailwind 原子类手写所有 UI，表单、弹窗、通知、日期选择、表格这类管理后台高频组件都要从头搭，重复劳动多。现有硬规则「前端不引入第三方 UI 组件库，样式用 Tailwind 原子类」挡住了引入组件库的路。

查证 Mantine 官网（v9.8.2）：120+ 组件、70+ hooks、30k GitHub stars、5M+ 月下载；v7 起改为原生 CSS、无运行时开销；官方明确兼容 Tailwind，Vite 是一等支持；还提供 llms.txt / agent skills / MCP server，与当前 agent 开发方式契合。

一句话目标：**仅管理端引入 Mantine，把交互组件交给它、布局微调仍用 Tailwind，在提升开发效率的同时立清边界，不影响 client/portal。**

## 2. 用户与场景

- **管理端开发者**：需要快速搭出表单、弹窗、通知、日期选择、数据表格，不想每次手写。
- **其它端开发者**：client/portal 继续用 Tailwind 原子类，不受影响（portal 还有 SEO 约束）。
- **模板维护者**：需要在规则层面说清「哪个端能用组件库、怎么分工」，防止两套样式系统打架。

## 3. 范围

### 3.1 本期做

- F1 改写硬规则：管理端允许 Mantine，其它端保持不引入第三方 UI 组件库
- F2 `apps/admin` 安装并接入 Mantine（依赖、样式导入、Provider、Tailwind 主题对齐）
- F3 样式分工规范：Mantine 管交互组件、Tailwind 管布局与间距微调
- F4 规范同步：AGENTS.md、react skill、conventions、CHANGELOG
- F5 样板页：用 Mantine 组件改写现有管理端基础页，作为共存验证

### 3.2 明确不做（非目标）

- `apps/client`、`apps/portal` 不引入 Mantine，不改样式体系
- 不引入 Mantine 全部扩展包（通知、图表、富文本等按需后续加）
- 不做深色模式切换（Mantine 开箱支持，本期不启用）
- 不改接口层、后端、数据库

### 3.3 依赖与假设

- Mantine 当前版本 v9.8.2，`tailwind-preset-mantine` v4 支持 Tailwind 4 + Mantine 7/8/9
- admin 当前栈：Vite 8 + React 19 + TS 7 + Tailwind 4（`@tailwindcss/vite`）
- 不需要 Docker/数据库；验证靠 `pnpm build` / `pnpm lint` / `pnpm typecheck`（静态可判定）

## 4. 功能清单

| 编号 | 功能 | 优先级 | 说明 |
| --- | --- | --- | --- |
| F1 | 改写硬规则 | P0 | AGENTS.md 第 16 行改为分端约定 |
| F2 | admin 接入 Mantine | P0 | 依赖 + 样式 + Provider + 主题对齐 |
| F3 | 样式分工规范 | P0 | 写进 conventions 与 react skill |
| F4 | 规范同步 | P1 | AGENTS / react skill / conventions / CHANGELOG |
| F5 | 样板页 | P1 | 用 Mantine 组件改写现有基础页 |

## 5. 详细需求

### F1 改写硬规则

- 原规则「前端不引入第三方 UI 组件库，样式用 Tailwind 原子类」改为：
  「管理端（`apps/admin`）允许使用 Mantine 组件库；`apps/client`、`apps/portal` 不引入第三方 UI 组件库，样式用 Tailwind 原子类」
- 保留其它前端约定（`export const` 组件写法、原生 fetch、页面目录结构）

### F2 admin 接入 Mantine

- 依赖：`@mantine/core`、`@mantine/hooks`（基础），`@mantine/form` 按需后续加
- 样式：`index.css` 用 `tailwind-preset-mantine` 替代 `@import "tailwindcss"`，由 preset 管理 layer 顺序，避免 Tailwind reset 覆盖 Mantine 样式
- Provider：在 `main.tsx` 的 `StrictMode` 内、`App` 外包 `MantineProvider`
- 样式导入：`import "@mantine/core/styles.css"` 放在入口
- 组件写法仍遵守 `export const Comp = () => {}`，不使用 `export default`

### F3 样式分工规范

- Mantine 负责：交互组件（表单控件、弹窗、通知、日期、表格、Combobox 等）
- Tailwind 负责：页面布局、间距、栅格、微调，通过 `className` 传给 Mantine 组件
- 不混用两套主题变量：`tailwind-preset-mantine` 已对齐 `mantine-color-*` 与 `color-*`、`spacing-*`
- 新增组件前先判断：是「交互控件」用 Mantine，还是「布局/样式」用 Tailwind

### F4 规范同步

- `templates/base/AGENTS.md`：F1 的规则改写
- `skills/standards/react/SKILL.md`：补 Mantine 接入与分工约定
- `docs/guides/conventions.md`：新增「前端样式与组件库」类别
- `docs/CHANGELOG.md`：记录本次变更

### F5 样板页

- 用 Mantine 组件改写 `apps/admin/src/App.tsx`：如 `Container` / `Title` / `Paper` / `Badge` / `Table` / `List` / `Loader` / `Alert`
- 保留原有功能（health 探活展示、todos 列表、加载/错误态），只换 UI 表达方式
- 作为「Mantine 组件 + Tailwind 布局」共存的样板

## 6. 验收标准

```
F1-AC1
Given 查看 templates/base/AGENTS.md 硬规则
When  查找「不引入第三方 UI 组件库」
Then  该规则只约束 client/portal，并明确写明 admin 允许 Mantine

F2-AC1
Given admin 的 package.json
When  检查依赖
Then  含 @mantine/core 与 @mantine/hooks，且 client/portal/package.json 不含 Mantine 依赖

F2-AC2
Given admin 的 main.tsx 与 index.css
When  查看应用根
Then  App 被 MantineProvider 包裹，入口导入 @mantine/core/styles.css，index.css 使用 tailwind-preset-mantine

F2-AC3
Given 执行 pnpm build
When  admin 子项目构建
Then  成功，无 Tailwind/Mantine 样式冲突报错

F3-AC1
Given 查看 docs/guides/conventions.md
When  查找样式分工章节
Then  存在独立分类，写明 Mantine 管交互组件、Tailwind 管布局微调、主题由 preset 对齐

F3-AC2
Given 查看样板页组件写法
When  检查导出方式
Then  全部为 export const，无 export default、无 function 声明

F4-AC1
Given 查看 react skill 与 CHANGELOG
When  搜索 Mantine
Then  两处均有对应约定/记录

F5-AC1
Given 执行 pnpm lint 与 pnpm typecheck
When  检查 admin
Then  全部通过，样板页保留原功能（health / todos / 加载态 / 错误态）
```

## 7. 非功能要求

- 不引入运行时 CSS-in-JS（Mantine v9 是原生 CSS）
- Mantine 组件样式不得被 Tailwind preflight 覆盖
- 只装按需包，不一键引入全部 Mantine 扩展
- 组件写法、页面目录、接口调用方式等既有约定不变

## 8. 埋点与度量

本期为工程规范与样板改造，无产品埋点。验证度量为：build/lint/typecheck 通过、依赖范围局限在 admin、规范文档命中。

## 9. 待确认问题

| 编号 | 问题 | 默认假设 | 影响面 |
| --- | --- | --- | --- |
| Q1 | 本期装哪些 Mantine 包 | 只装 `@mantine/core` + `@mantine/hooks`，form / notifications 等按需再加 | 依赖体积与后续扩展节奏 |
| Q2 | 现有基础页是否改写 | 改写为 Mantine 版作为样板，保留原功能 | 页面外观变化 |
| Q3 | 是否启用深色模式 | 本期不启用（Mantine 开箱支持，后续按需开） | Provider 配置复杂度 |
