// TypeScript 6 对副作用 import 做严格模块解析，全局 CSS 需要显式声明
// Next.js 15 的 next-env.d.ts 在 bundler 解析下未覆盖此场景
declare module "*.css";
