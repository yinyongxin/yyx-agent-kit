# 管理端路由与菜单布局 — 技术方案

输入：`docs/deliverables/20261124-admin-router/01-prd.md`（Q1/Q2/Q3 已逐项确认）。目标产出：admin 具备 file-based 路由 + 可折叠侧边菜单，7 条路由可达、菜单分组与高亮正确。

## 1. 现状

- `apps/admin`：`main.tsx` 直接渲染 `<App />`（已含 `MantineProvider`），`App.tsx` 单页混合 health 与 todos
- 无路由、无菜单、无 `src/routes/` 目录、无 `vite.config.ts` 的 router 插件
- 已有依赖：Mantine 9（core/hooks）、`tailwind-preset-mantine`、React 19、Vite 8、TS 7
- react skill 技术栈写有 `@tanstack/react-router`，但模板未安装

## 2. 可行性结论

| 功能 | 结论 | 依据 |
| --- | --- | --- |
| F1 安装路由依赖 | 可做 | 官网现有 React 项目手动装 `@tanstack/react-router` + `@tanstack/router-plugin` |
| F2 路由骨架 | 可做 | 官网 Vite 配置：`tanstackRouter({ target: 'react', autoCodeSplitting: true })` 放在 `react()` 之前；默认生成 `src/routeTree.gen.ts` |
| F3 可折叠侧边菜单 | 可做 | Mantine `AppShell` + `NavLink` + `useDisclosure`，TanStack `Link` 自带 active 状态，均为官方能力 |
| F4 页面拆分与占位 | 可做 | 现有 `App.tsx` 逻辑清晰，拆两页不改数据流；占位页纯静态 |
| F5 规范同步 | 可做 | 纯文档 |

全部「可做」，无回退项。

## 3. 方案概述

```mermaid
flowchart LR
    A[Vite 装 router 插件] --> B[src/routes 建 7 个页面文件]
    B --> C[插件自动生成 routeTree.gen.ts]
    C --> D[__root 用可折叠 AppShell 布局]
    D --> E[AdminMenu 7 项分 3 组]
    E --> F[main.tsx 用 RouterProvider]
    F --> G[build/lint/typecheck + 浏览器导航验证]
```

## 4. 技术选型

| 选项 | 结论 | 理由 | 被否原因 |
| --- | --- | --- | --- |
| TanStack Router（file-based） | 选用 | 官网推荐、类型安全、自动生成路由树、Vite 插件成熟 | — |
| TanStack Router（code-based） | 否 | 路由需手写维护，类型推导弱 | 违反「新增页面只加文件」目标 |
| React Router | 否 | react skill 已定技术栈为 TanStack Router | 改技术栈需额外决策 |

## 5. 数据模型

无。本期不涉及数据库。

## 6. 接口契约

无新接口。首页/工作台继续调用 `api.health()` / `api.todos()`。

## 7. 模块与文件规划

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `apps/admin/package.json` | 改 | dependencies 加 `@tanstack/react-router`；devDependencies 加 `@tanstack/router-plugin` |
| `apps/admin/vite.config.ts` | 改 | 加 `tanstackRouter({ target: 'react', autoCodeSplitting: true })`，放在 `react()` 之前 |
| `apps/admin/src/routes/__root.tsx` | 新增 | root 路由，渲染 `AdminLayout`（可折叠菜单 + Outlet） |
| `apps/admin/src/routes/index.tsx` | 新增 | 首页：health 探活状态 |
| `apps/admin/src/routes/dashboard.tsx` | 新增 | 工作台：todos 列表 |
| `apps/admin/src/routes/users.tsx` | 新增 | 占位：用户管理 |
| `apps/admin/src/routes/roles.tsx` | 新增 | 占位：角色管理 |
| `apps/admin/src/routes/tenants.tsx` | 新增 | 占位：租户管理 |
| `apps/admin/src/routes/permissions.tsx` | 新增 | 占位：权限管理 |
| `apps/admin/src/routes/settings.tsx` | 新增 | 占位：设置 |
| `apps/admin/src/components/AdminLayout.tsx` | 新增 | 可折叠 AppShell：Header（应用名 + 折叠按钮）、Navbar、Main（Outlet） |
| `apps/admin/src/components/AdminMenu.tsx` | 新增 | 菜单项集中配置（label + to + icon），3 组 7 项 |
| `apps/admin/src/main.tsx` | 改 | 创建 router，`RouterProvider` 包裹（保留 `MantineProvider`） |
| `apps/admin/src/App.tsx` | 删除 | 单页内容已拆到路由页 |
| `apps/admin/src/routeTree.gen.ts` | 自动生成 | 插件生成，**不手改、不加注释** |
| `skills/standards/react/SKILL.md`、`docs/CHANGELOG.md` | 改 | 补路由约定与记录 |

## 8. 关键流程

**开发新页面**：在 `src/routes/` 加文件 → 插件自动更新 `routeTree.gen.ts` → 在 `AdminMenu.tsx` 加一项 → 完成。
**导航与折叠**：左侧 `NavLink` 用 `Link to=...`，TanStack Router 自动处理 active；Header 按钮用 `useDisclosure` 切换 `AppShell` 的 `collapsed`；`AppShell.Main` 内 `<Outlet />` 渲染当前页，布局不重挂载。
**异常分支**：
- `routeTree.gen.ts` 报错或过期：重启 dev/build 让插件重新生成，不手改生成物
- 菜单高亮不对：检查 `Link` 的 `to` 与路由路径一致，不用手写 className
- lint 扫到生成物：把 `routeTree.gen.ts` 加入 lint/格式化忽略（与官网建议一致，AGENTS.md 已约定生成物不手改）

## 9. 安全与权限

无新增安全面。本期不做路由守卫与菜单权限过滤（PRD 非目标），后续接入认证再补。

## 10. 兼容与迁移

- **与 Mantine Provider 的顺序**：`MantineProvider` 仍包在最外层，`RouterProvider` 在内层，保证路由页拿到 Mantine 主题
- **组件写法**：路由组件导出 `Route = createFileRoute('/path')({ component: XxxPage })`，`XxxPage` 用 `export const`；`export const Route` 是框架要求，不算组件写法违规
- **生成物治理**：`routeTree.gen.ts` 由插件管理，oxlint 若报生成物问题则加 ignore-pattern
- **client / portal**：完全不动

## 11. 任务拆分

| 编号 | 任务 | 涉及文件 | 依赖 | 验收方式 |
| --- | --- | --- | --- | --- |
| T1 | 安装依赖 + Vite 插件 | package.json、vite.config.ts | — | 插件在 react() 之前，build 能生成 routeTree |
| T2 | 路由骨架（7 页） | src/routes/*.tsx、main.tsx | T1 | 7 条路由可访问，routeTree.gen.ts 自动生成 |
| T3 | 可折叠菜单布局 | AdminLayout.tsx、AdminMenu.tsx、__root.tsx | T2 | 7 项分 3 组、当前项高亮、折叠/展开正常 |
| T4 | 页面拆分与占位 | index.tsx、dashboard.tsx、其余 5 页 | T2 | health/todos 分到首页/工作台并保留状态表达 |
| T5 | 规范同步 | react skill、CHANGELOG | T1-T4 | 命中路由约定与记录 |
| T6 | 验证 | — | T1-T5 | build/lint/typecheck + 浏览器 7 路由导航验证 |

## 12. 风险

| 风险 | 触发条件 | 应对 |
| --- | --- | --- |
| 插件顺序错误 | `tanstackRouter` 放在 `react()` 之后 | 官网明确要求之前，配置时核对 |
| 生成物被手改/被 lint 改 | 有人编辑 `routeTree.gen.ts` | AGENTS.md 已禁止；lint 加 ignore-pattern |
| 菜单配置散落 | 开发者在页面里写菜单 | 约定集中在 `AdminMenu.tsx`，review 检查 |
| 版本漂移 | `latest` 指向不兼容版本 | 显式锁 router 与 plugin 同 major |
