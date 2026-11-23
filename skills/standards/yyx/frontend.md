# 前端开发

## 技术栈

- **框架**: React + TypeScript
- **构建工具**: Vite（`@vitejs/plugin-react`）
- **CSS**: Tailwind CSS + PostCSS（原子化，不引入第三方 UI 组件库）
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
