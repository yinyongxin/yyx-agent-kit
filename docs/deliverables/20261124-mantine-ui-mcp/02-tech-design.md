# 采用 Mantine 官方预制布局 + 接入 LLM 支持

> 小需求裁剪：无新接口、无数据变更，合并阶段 1（需求与验收）与阶段 2（技术方案）。
> 触发原因：前两轮只查了 mantine.dev 主站，漏了 ui.mantine.dev 的现成组件生态与官方 LLM 支持，属于「只查二手来源」的同类疏漏（见踩坑 #19）。

## 1. 需求与验收标准

**目标**：用 ui.mantine.dev 官方现成的 `NavbarNested` / `LinksGroup` 替换手写菜单；接入 Mantine 官方 LLM 支持（MCP server + llms.txt 规范），让后续 agent 能拿到最新官方用法。

| 编号 | 验收标准 |
| --- | --- |
| AC1 | admin 使用官方 `NavbarNested` + `LinksGroup` 实现菜单（含 CSS Module、`@tabler/icons-react` 图标），替换手写 `AdminMenu` |
| AC2 | 菜单保留 7 项 3 组、TanStack `Link` 导航、当前项高亮、AppShell 整体可折叠 |
| AC3 | `postcss.config.cjs` 按官网 Vite 指南配置，官方 CSS Module 的 `@mixin hover` 能编译 |
| AC4 | 模板 `.opencode/opencode.json` 配置 `mantine` MCP server（`npx -y @mantine/mcp-server`） |
| AC5 | 规范写明查 Mantine 最新用法走 MCP / `https://mantine.dev/llms.txt` |
| AC6 | `pnpm build` / `lint` / `typecheck` 通过；浏览器验证菜单渲染与路由导航 |

**非目标**：不改业务逻辑、不接真实数据、不改 client/portal、不做深色模式。

## 2. 可行性结论

| 项 | 结论 | 依据 |
| --- | --- | --- |
| 官方 NavbarNested / LinksGroup | 可做 | ui.mantine.dev 源码公开（MIT），`NavbarNested` 用 `LinksGroup` + `ScrollArea` + CSS Module；`LinksGroup` 用 `Collapse` + `UnstyledButton` 实现分组折叠 |
| CSS Module 的 `@mixin hover` | 可做 | 官网 Vite 指南给出 `postcss-preset-mantine` + `postcss-simple-vars` 配置 |
| 图标 | 可做 | 官方组件用 `@tabler/icons-react`，按需安装 |
| MCP 接入 | 可做 | OpenCode V2 `mcp.servers.<name>` + `type: local` + `command`（官网 MCP 文档确认） |
| llms.txt | 可做 | 官网提供 `https://mantine.dev/llms.txt` 与 `llms-full.txt`，写入规范即可 |

全部「可做」。

## 3. 方案

### 3.1 官方预制菜单

- 从 ui.mantine.dev 复制 `NavbarNested.tsx`、`NavbarNested.module.css`、`NavbarLinksGroup.tsx`、`NavbarLinksGroup.module.css` 到 `src/components/navbar/`
- 适配：mockdata 换成我们的 7 项 3 组；子链接 `Text component="a"` 换成 TanStack `Link`（保留高亮）；去掉 `UserButton`/`Logo` 依赖，用简单标题
- 图标用 `@tabler/icons-react`（IconGauge / IconUsers / IconLock / IconSettings 等）
- `AdminLayout` 的 `AppShell.Navbar` 内放 `NavbarNested`；保留 Header 的整体折叠按钮

### 3.2 PostCSS

- 装 `postcss`、`postcss-preset-mantine`、`postcss-simple-vars`（dev）
- 按官网 Vite 指南建 `postcss.config.cjs`（含 mantine 断点变量）

### 3.3 LLM 支持接入

- `templates/base/.opencode/opencode.json` 加 `mcp.servers.mantine`（local，`npx -y @mantine/mcp-server`）
- `docs/guides/conventions.md` 新增约定：查 Mantine 组件用法优先用 `mantine` MCP 或 `https://mantine.dev/llms.txt`（官方随版本更新），不靠记忆
- react skill 同步该约定

## 4. 任务拆分

| 编号 | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| T1 | 装图标与 PostCSS 依赖 | package.json、pnpm-lock.yaml | 依赖就位 |
| T2 | 复制并适配官方 navbar 组件 | src/components/navbar/* | 官方结构 + 我们的 7 项 3 组 + TanStack Link |
| T3 | PostCSS 配置 | postcss.config.cjs | 官方 CSS Module 可编译 |
| T4 | AdminLayout 接入 | AdminLayout.tsx | Navbar 内用 NavbarNested，整体折叠保留 |
| T5 | MCP + 规范 | opencode.json、conventions.md、react skill、CHANGELOG | MCP 配置与查文档约定命中 |
| T6 | 验证 | — | build/lint/typecheck + 浏览器导航 |

## 5. 风险

- 官方组件用 `function` 声明与 `export function`——我们的约定是 `export const`：适配时改为 `export const`，不照搬
- `@tabler/icons-react` 增加依赖体积：只 import 用到的图标（按需 tree-shake）
- MCP server 首次 `npx` 需联网：模板生成的项目首次使用时联网拉取，配置本身不锁版本
