# 管理端路由与菜单布局 — 开发日志（阶段 3）

## 待确认项结论

Q1/Q2/Q3 逐项确认：菜单 7 项分 3 组（首页/工作台｜用户/角色/租户/权限｜设置）；布局为可折叠左侧导航 + 内容区（Mantine AppShell）；设置页为占位页。

## 任务完成情况

| 编号 | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| T1 | 安装依赖 + Vite 插件 | `apps/admin/package.json`、`vite.config.ts` | `@tanstack/react-router` 1.170.46、`@tanstack/router-plugin` 1.169.0；`tanstackRouter` 放在 `react()` 之前 |
| T2 | 路由骨架（7 页） | `src/routes/*.tsx`、`src/routeTree.gen.ts`、`main.tsx` | 7 条路由可访问；routeTree 由插件生成；`RouterProvider` 在 `MantineProvider` 内层 |
| T3 | 可折叠菜单布局 | `AdminLayout.tsx`、`AdminMenu.tsx`、`__root.tsx` | 7 项分 3 组、当前项高亮、桌面/移动端折叠按钮 |
| T4 | 页面拆分与占位 | `src/pages/*`、删除 `src/App.tsx` | health→首页、todos→工作台，保留加载/错误/空态；其余 5 页占位 |
| T5 | 规范同步 | react skill、CHANGELOG | 命中路由约定与记录 |
| T6 | 验证 | — | 见下 |

## 阶段 3 发现的真实缺陷及修复

**路由文件 TDZ 错误**：初版把页面组件写在路由文件内，且 `export const Route = createFileRoute('/')({ component: HomePage })` 出现在 `export const HomePage` 之前，运行时报 `ReferenceError: Cannot access 'HomePage' before initialization`（浏览器 dev 日志捕获）。同时 TanStack Router 警告路由文件导出页面组件会破坏 code-splitting。

**修复**：页面组件移到 `src/pages/`（仍用 `export const`），路由文件只导入组件、只导出 `Route`。修复后 build 显示每个页面独立 chunk（settings/permissions/roles/tenants/users/dashboard），code-splitting 生效。

## 验证结果

| 验证 | 结果 |
| --- | --- |
| `pnpm build` | 通过。6 子项目构建 + 全量 typecheck；admin 路由按页 code-split |
| `pnpm lint` | 通过（oxlint） |
| 浏览器导航（ego-browser 0.6.3.17 / chromium 156） | 7 条路由逐页验证：`/`、`/dashboard`、`/users`、`/roles`、`/tenants`、`/permissions`、`/settings` 均渲染正确标题与内容，无 404 |
| 菜单高亮 | 首页/工作台等当前项高亮（截图确认） |
| 折叠 | 点击 Header 折叠按钮后 snapshot 中 7 个菜单项消失、内容区变宽，再点可恢复 |
| 错误态 | 后端未启动返回 502，首页/工作台正确显示 Mantine `Alert` |

截图：`D:/opencode-poc/ego-admin/router-home.png`、`router-dashboard.png`（临时目录，不入库）。

## 环境观察（非缺陷）

- 本机内存紧张：dev server 的 vite 进程占约 755MB，全量 build 的 typescript-go 阶段曾 OOM；停掉 dev server 后 build 通过。`pnpm add` 第一次也因 OOM 失败，单独重试成功。
- 浏览器验证期间偶发 `PageUnresponsiveError`（页面导航未稳定时截图），按 ego 指南重试一次成功，不影响结论。
- 后端接口 502 是本机无 Docker/PostgreSQL 的环境限制（本需求非目标）。

## 遗留

- 未做路由守卫与菜单权限过滤（PRD 非目标，待后端认证接入管理端后再补）。
- 用户/角色/租户/权限页为占位，不接真实数据。
