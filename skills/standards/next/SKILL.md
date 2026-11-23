---
name: Next.js 规范
description: 开发 Next.js（App Router）项目时加载。服务端/客户端组件划分、数据获取、路由、SEO、与 monorepo 共享包的搭配
---

# Next.js 规范

## 什么时候用 Next

需要 SEO 或首屏性能的**公开站点**（门户、营销页、内容站）。登录后的后台和业务应用优先用 Vite SPA，不要为了"统一技术栈"把所有前端迁到 Next。

## App Router 约定

- 路由 = `src/app/<段>/page.tsx`，布局用 `layout.tsx`，全局样式只在根 layout 引入一次
- 默认是 Server Component。只有需要 `useState` / 事件 / 浏览器 API 时才加 `"use client"`，并下沉到叶子组件
- 服务端组件内禁止 `window`、`localStorage`、`document`
- 页面级 metadata 用 `export const metadata`，不要手写 `<head>`

## 数据获取

- 内容页优先在服务端获取，明确缓存策略：`revalidate`（增量）或 `force-dynamic`（每次都取）
- 交互密集的子树才做成 Client Component，数据由服务端以 props 传入
- 不要在 Client Component 里另写一套请求，统一走 `packages/api`

## 与 monorepo 共享包

- `packages/*` 是 TS 源码，必须在 `next.config.ts` 的 `transpilePackages` 里声明；新增共享包要同步加，否则运行时报解析错误
- 共享包禁止引入 `window` / `document`，否则服务端渲染直接崩

## 端口与接口

- 端口用 **47xxx 段**，不用 Next 默认的 3000
- 接口统一 `/api` 前缀，用 `next.config.ts` 的 `rewrites` 代理到后端；不在代码里写后端域名

## 构建产物

- `.next/` 不提交
- `next-env.d.ts` 由 Next 生成，不手改
- Next 会自动补全 `tsconfig.json`（`allowJs`、`resolveJsonModule`、`paths` 等），不要为此报错或回退
