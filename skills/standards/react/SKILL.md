---
name: React 前端规范
description: 开发 React / TypeScript 前端时加载。Vite、Tailwind、路由、状态管理、组件风格、目录结构
---

# React 前端规范

## 技术栈

- **框架**: React + TypeScript
- **构建工具**: Vite（`@vitejs/plugin-react`）
- **CSS / 组件库**: 管理端（`apps/admin`）用 Mantine 组件 + Tailwind 布局微调（`tailwind-preset-mantine` 对齐主题）；client / portal 只用 Tailwind 原子类，不引入第三方 UI 组件库。分工见 `docs/guides/conventions.md`「前端样式与组件库」
- **图标**: lucide-react
- **路由**: @tanstack/react-router
- **状态管理**: Zustand
- **表单**: react-hook-form + Zod
- **Linter**: oxlint
- **Formatter**: Prettier
- **HTTP**: 原生 fetch（不引入 axios）
- **组件风格**: `export const Comp = () => {}`，不使用 `function` 声明或 `export default`

## 开发规范

- 页面文件统一 `[业务名]/[业务名].tsx` 结构
- 页面内组件放 `components/` 目录，全局共享放 `src/components/`
- 管理端交互控件优先用 Mantine（表单、表格、弹窗、通知、日期），布局与间距用 Tailwind 的 `className`；组件写法仍为 `export const`
- 路由用 `@tanstack/react-router` file-based 模式：页面文件放 `src/routes/`，`routeTree.gen.ts` 由 Vite 插件生成、禁止手改；菜单集中在 `src/components/navbar/`，复用 ui.mantine.dev 官方组件（NavbarNested + LinksGroup），不在页面里散落写菜单
- 查 Mantine 最新用法优先用 `mantine` MCP 或 `https://mantine.dev/llms.txt`（官方随版本更新），不靠记忆
- **组件 props 必须查一手文档确认，不凭经验写**：用 `get_item_props` 或 llms.txt 查实际字段名（案例：`ActionBar` 用 `opened` 不是 `visible`；紧凑按钮是 `size="compact-sm"` 不是 `compact` prop——两者都曾凭经验写错，typecheck 才抓到）
- **写完组件立即跑 `pnpm --filter @starter/admin typecheck`**，不要攒到最后；未使用解构、Context 缺字段、泛型不兼容、误从 `@mantine/core` 导入 `ReactNode` 这类错误 typecheck 一抓一个准
