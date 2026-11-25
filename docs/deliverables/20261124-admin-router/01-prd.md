# 管理端路由与菜单布局 PRD

## 1. 背景与目标

`apps/admin` 目前是单页 `App.tsx`，health 探活和 todos 列表挤在同一屏，没有路由、没有导航菜单。随着管理端功能增加，需要多页结构与左侧菜单。

技术栈已定 `@tanstack/react-router`（react skill），但模板尚未安装；Mantine 已落地，其 `AppShell` + `NavLink` 适合做可折叠管理端菜单。TanStack Router 官网确认：现有 React 项目装 `@tanstack/react-router` + `@tanstack/router-plugin`，推荐 file-based 路由（自动生成 `routeTree.gen.ts`），pathless layout route 可包住所有子页。

一句话目标：**给管理端建立 file-based 路由 + 可折叠侧边菜单布局，把现有 health/todos 拆到首页/工作台，其余页面占位，新增页面只需加路由文件与菜单项。**

## 2. 用户与场景

- **管理端用户**：通过左侧可折叠菜单在 7 个页面间切换，当前项高亮，URL 反映所在页。
- **开发者**：新增页面只需在 `src/routes/` 加文件并在 `AdminMenu.tsx` 加一项，不碰布局代码。

## 3. 范围

### 3.1 本期做

- F1 安装 TanStack Router 与 Vite 插件
- F2 file-based 路由骨架：root + 7 个页面路由，`routeTree.gen.ts` 自动生成
- F3 可折叠侧边菜单布局：Mantine `AppShell` + `NavLink`，菜单项集中配置、分组、当前项高亮
- F4 现有 health/todos 拆分到首页/工作台，其余页面占位
- F5 规范同步（react skill 补路由约定、CHANGELOG）

### 3.2 明确不做（非目标）

- 不做路由守卫/鉴权（后端认证尚未接入管理端）
- 不做动态路由、loader、search 参数校验
- 不改 client / portal / 后端
- 不做菜单权限过滤（所有菜单项对所有人可见）
- 用户/角色/租户/权限页均为占位，不接真实数据

### 3.3 依赖与假设

- admin 已是 Vite 8 + React 19 + Mantine 9 + Tailwind 4
- 路由用 file-based 模式，`routeTree.gen.ts` 是生成物，不手改（AGENTS.md 约定）
- 不需要 Docker/数据库；验证靠 `pnpm build` / `lint` / `typecheck` + 浏览器导航验证

## 4. 功能清单

| 编号 | 功能 | 优先级 | 说明 |
| --- | --- | --- | --- |
| F1 | 安装路由依赖 | P0 | `@tanstack/react-router` + `@tanstack/router-plugin` |
| F2 | 路由骨架 | P0 | root + 7 页面路由，自动生成 routeTree |
| F3 | 可折叠侧边菜单 | P0 | AppShell + NavLink，分组、集中配置、当前项高亮、可折叠 |
| F4 | 页面拆分与占位 | P0 | health→首页，todos→工作台，其余 5 页占位 |
| F5 | 规范同步 | P1 | react skill、CHANGELOG |

## 5. 详细需求

### F1 安装路由依赖

- dependencies：`@tanstack/react-router`
- devDependencies：`@tanstack/router-plugin`（Vite 插件，自动生成 routeTree）

### F2 路由骨架

- `src/routes/__root.tsx`：`createRootRoute()`，渲染 pathless layout（可折叠菜单 + Outlet）
- 页面路由（7 个）：

| 路由 | 文件 | 内容 |
| --- | --- | --- |
| `/` | `index.tsx` | 首页：health 探活状态（含加载/错误态） |
| `/dashboard` | `dashboard.tsx` | 工作台：todos 列表（含加载/空态） |
| `/users` | `users.tsx` | 占位：用户管理 |
| `/roles` | `roles.tsx` | 占位：角色管理 |
| `/tenants` | `tenants.tsx` | 占位：租户管理 |
| `/permissions` | `permissions.tsx` | 占位：权限管理 |
| `/settings` | `settings.tsx` | 占位：设置 |

- `src/routeTree.gen.ts`：插件自动生成，**不手改、不加注释**
- `main.tsx`：创建 router 并用 `RouterProvider` 包裹（保留 `MantineProvider` 与样式导入）

### F3 可折叠侧边菜单

- Mantine `AppShell`：`Header`（应用名 + 折叠按钮）、`Navbar`（菜单）、`Main`（页标题 + `<Outlet />`）
- 折叠：`@mantine/hooks` 的 `useDisclosure` 管理 `collapsed` 状态，`AppShell.Navbar` 收起时只留图标
- 菜单项用 Mantine `NavLink` + TanStack `Link`，配置集中在 `src/components/AdminMenu.tsx`：`{ label, to, icon }`
- 分组：概览（首页、工作台）/ 权限管理（用户、角色、租户、权限）/ 系统（设置）
- 当前路由项高亮用 `Link` 的 active 状态，不手写 className 判断
- 菜单只在 admin 用，不放 `packages/shared`

### F4 页面拆分与占位

- 原 `App.tsx` 的 health 展示移到 `index.tsx`，todos 列表移到 `dashboard.tsx`
- 占位页统一结构：标题 + 说明文字（如「用户管理 — 功能建设中」）
- 保留加载态（Loader）、错误态（Alert）、空态（暂无数据）
- 数据流仍走 `api.health()` / `api.todos()`

### F5 规范同步

- react skill：补 file-based 路由约定、菜单集中配置、`routeTree.gen.ts` 不手改
- CHANGELOG：记录路由与菜单布局

## 6. 验收标准

```
F1-AC1
Given admin/package.json
When  检查依赖与 vite.config.ts
Then  含 @tanstack/react-router 与 @tanstack/router-plugin；vite.config.ts 中 tanstackRouter 在 react() 之前

F2-AC1
Given src/routes/ 目录
When  查看文件
Then  有 __root.tsx 与 7 个页面文件，routeTree.gen.ts 由插件生成且未被手改

F2-AC2
Given 浏览器访问 /、/dashboard、/users、/roles、/tenants、/permissions、/settings
When  逐页导航
Then  7 条路由均渲染对应页面，无 404

F3-AC1
Given 管理端任意页面
When  查看左侧菜单
Then  7 个 NavLink 项按 3 组展示，当前路由项高亮

F3-AC2
Given 点击 Header 折叠按钮
When  菜单收起/展开
Then  Navbar 宽度变化、图标保留，内容区自适应；再点可恢复

F3-AC3
Given 点击菜单项
When  路由切换
Then  URL 与内容同步变化，布局（菜单）不重新挂载

F4-AC1
Given 首页与工作台页
When  查看内容
Then  首页显示 health 探活状态，工作台显示 todos 列表，均保留加载/错误/空态；其余 5 页显示占位说明

F5-AC1
Given react skill 与 CHANGELOG
When  搜索「路由」或「TanStack」
Then  两处均有对应约定/记录
```

## 7. 非功能要求

- 组件写法统一 `export const Comp = () => {}`，不使用 `function` 声明或 `export default`
- 生成物 `routeTree.gen.ts` 禁止手改、不加注释
- 菜单配置只在 admin，不污染 `packages/shared`
- 不引入额外 UI 库（菜单用已落地的 Mantine）

## 8. 埋点与度量

本期为工程结构改造，无产品埋点。验证度量为：build/lint/typecheck 通过、7 条路由可达、菜单高亮与折叠正确。

## 9. 待确认问题（已逐项确认）

| 编号 | 问题 | 结论 |
| --- | --- | --- |
| Q1 | 菜单项 | 首页、工作台、用户、角色、租户、权限、设置（7 项，3 组） |
| Q2 | 布局形态 | 可折叠左侧导航 + 内容区（AppShell） |
| Q3 | 设置页内容 | 占位页（标题 + 说明） |
