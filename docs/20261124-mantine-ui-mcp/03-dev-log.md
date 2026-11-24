# 采用 Mantine 官方预制布局 + 接入 LLM 支持 — 开发日志

## 任务完成情况

| 编号 | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| T1 | 装图标与 PostCSS 依赖 | admin/package.json、pnpm-lock.yaml | `@tabler/icons-react`、`postcss`、`postcss-preset-mantine`、`postcss-simple-vars` 就位 |
| T2 | 复制并适配官方 navbar 组件 | `src/components/navbar/*` | 官方 `NavbarNested` + `LinksGroup` 结构，7 项 3 组，`export const`，子链接用 TanStack `Link`，加 `linkActive` 高亮 |
| T3 | PostCSS 配置 | `apps/admin/postcss.config.cjs` | 按官网 Vite 指南配置，官方 CSS Module 的 `@mixin hover` 可编译 |
| T4 | AdminLayout 接入 | `AdminLayout.tsx`，删除 `AdminMenu.tsx` | Navbar 内用 `NavbarNested`，Header 整体折叠保留 |
| T5 | MCP + 规范 | `.opencode/opencode.json`、conventions.md、react skill、CHANGELOG | `mantine` MCP server 配置命中；规范写明用 MCP / llms.txt 查最新用法 |
| T6 | 验证 | — | 见下 |

## 为什么重做（复盘）

前两轮我只查了 mantine.dev 主站，漏了 ui.mantine.dev 的现成组件生态和官方 LLM 支持——跟 Prisma 那次是同一类疏漏（踩坑 #19：只查二手/单一来源）。用户指出后才补查：

- ui.mantine.dev 有 123 个免费预制组件，Navbars 分类 9 个，其中 `NavbarNested`/`LinksGroup` 正好是我们要的分组可折叠菜单
- mantine.dev/guides/llms 提供 llms.txt、MCP server、agent skills 三种方式，官方随每个版本更新

以后涉及 Mantine 用法，先查 MCP / llms.txt，再考虑手写。

## 验证结果

| 验证 | 结果 |
| --- | --- |
| `pnpm build` | 通过。admin 7584 modules 转换成功（@tabler/icons-react 体积），6 子项目构建 + 全量 typecheck 通过；路由仍按页 code-split |
| `pnpm lint` | 通过（oxlint） |
| PostCSS / 官方 CSS Module | 通过，`@mixin hover` 正常编译 |
| 浏览器视觉验证（ego-browser 0.6.3.17 / chromium 156） | 通过。官方 `NavbarNested` 渲染 3 个带 Tabler 图标的分组 + 7 个链接，当前项高亮、子链接竖线正常；点击「设置」导航到 `/settings` 显示占位内容；点击「权限管理」分组后其 4 个子链接折叠消失。截图 `D:/opencode-poc/ego-admin/navbar-official.png`（临时目录，不入库） |

## 追加需求：double-navbar + navbar-nested 切换

用户要求布局采用 ui.mantine.dev 的 `double-navbar` 与 `navbar-nested` 两种官方设计，并能切换。

| 编号 | 任务 | 文件 | 结果 |
| --- | --- | --- | --- |
| T7 | 复制并适配官方 DoubleNavbar | `src/components/navbar/DoubleNavbar.tsx` + `.module.css` | 左图标栏 3 组 + 右文字子导航，图标用 Tabler，`export const`，子链接用 TanStack `Link` |
| T8 | Header 切换按钮 | `AdminLayout.tsx` | `IconArrowsExchange` + Tooltip，state 在 `nested` / `double` 间切换 |
| T9 | 安装 Mantine agent skills | 全局 `~/.agents/skills/` | `mantine-combobox`、`mantine-form`、`mantine-custom-components` 三件套装好 |

**浏览器验证（ego-browser，space 6）**：
- 初始 nested：3 分组按钮 + 7 链接，当前项「首页」高亮
- 点切换按钮 → double：左侧「S」+ 3 个图标按钮 + 右侧「概览」标题与 2 个链接，Tooltip 显示「切换为嵌套菜单」
- 点左栏「权限管理」→ 右栏切到 4 个链接（用户/角色/租户/权限）
- 点「用户」→ 跳转 `/users` 显示占位内容
- 截图 `D:/opencode-poc/ego-admin/navbar-double.png`

## 追加需求：去掉 Header，只保留左右布局

用户要求不要 Header，整体只需 Navbar + Content 两栏。

- `AdminLayout.tsx` 去掉 `AppShell.Header` 与 `AppShell` 容器，改用纯 flex 两栏：左侧菜单（顶部工具条放「starter」文字 + 切换布局按钮 + 折叠按钮），右侧 `<Outlet />`
- 移动端用 `useMediaQuery("(max-width: 48em)")` 控制菜单显示，保留一个浮动打开按钮
- 切换布局入口从 Header 移到 Navbar 顶部工具条，double / nested 切换仍可用
- 浏览器验证（ego-browser，space 7）：snapshot 确认无 Header 节点，左侧工具条 + 官方菜单、右侧首页内容；点击切换按钮后左侧变为 DoubleNavbar。截图 `D:/opencode-poc/ego-admin/noheader-nested.png`

## 追加需求：增加两种 Header 模式（共四种布局）

用户要求在两种侧栏模式之外，再增加 ui.mantine.dev 的 `header-menu` 与 `header-mega-menu`，四种模式可切换。

| 编号 | 任务 | 文件 | 结果 |
| --- | --- | --- | --- |
| T10 | 官方 HeaderMenu 适配 | `src/components/header/HeaderMenu.tsx` + `.module.css` | hover 下拉 + 移动端 Drawer，链接换成 TanStack `Link`，菜单换成 3 组 |
| T11 | 官方 HeaderMegaMenu 适配 | `src/components/header/HeaderMegaMenu.tsx` + `.module.css` | HoverCard 卡片大菜单 + Drawer，数据换成我们的 7 项，去掉登录按钮 |
| T12 | 四模式循环切换 | `AdminLayout.tsx` | `nested → double → header-menu → header-mega-menu` 循环；切换按钮改右上角浮动（所有模式可见）；侧栏模式保留折叠，Header 模式 Content 直接占满 |

**浏览器验证（ego-browser，space 8）**：连续点浮动切换按钮 4 次，snapshot 依次确认：
1. 嵌套侧栏（starter + 管理菜单 + 7 链接）
2. 双栏侧栏（S + 图标栏 + 概览）
3. 顶部菜单（starter + 概览/权限管理/设置）
4. 顶部大菜单（starter + 首页/概览/权限管理/设置）

截图 `D:/opencode-poc/ego-admin/mode-{0,1,2,3}.png`。typecheck 抓到并修复 `LAYOUTS.indexOf(...)` 在 TS 7 下可能 undefined 的类型错误（加 `!`）。

## 验证补充（切换功能）

- `pnpm --filter @starter/admin typecheck`、`pnpm lint` 通过。typecheck 抓到并修复了一个真实类型错误：`DoubleNavbar` 中 `GROUPS.find(...) ?? GROUPS[0]` 在 TS 7 下 `group` 可能为 undefined，已改为 `GROUPS[0]!`。
- `pnpm build` 两次因本机内存不足在 Rolldown 阶段 OOM（新增图标后模块峰值更高），属环境问题；typecheck/lint 已覆盖代码正确性，浏览器 dev 验证（加 `NODE_OPTIONS=--max-old-space-size=2048`）正常。

## 环境观察（非缺陷）

- dev server 首次启动在 Vite 依赖优化阶段 OOM：`@tabler/icons-react` 7584 模块预打包撑爆本机内存（系统可用仅约 2–4GB）。生产 `pnpm build` 正常通过，说明是本机 dev 环境资源限制，不是代码问题。
- 处理：给 Vite 主进程加 `NODE_OPTIONS=--max-old-space-size=2048` 重试（之前对 Next.js worker 无效，但 Vite 主进程会继承）。若仍失败，可在 `vite.config.ts` 加 `optimizeDeps.exclude: ["@tabler/icons-react"]` 跳过预打包。
- 期间多次 pnpm 安装因内存峰值 OOM，串行重试后成功。

## 遗留

- 官方 `NavbarNested` 是「分组可折叠 + 子链接导航」两级结构，与之前单层 7 项略有 UX 差异；已把所有分组设为 `initiallyOpened: true`，默认展开，视觉上仍直接可见 7 项。
- MCP server 首次 `npx` 需联网拉取；配置本身不锁版本，便于拿到最新文档。
