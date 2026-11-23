# portal

## 职责

面向**未登录访客**的公开门户站点。SEO 是首要约束，默认用服务端渲染 / 静态生成。

## 技术栈

Next.js 16（App Router）+ React 19 + Tailwind 4，端口 **47175**。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `next.config.ts` | 转译 workspace 包、`/api` 反向代理 |
| `postcss.config.mjs` | Tailwind 4 的 PostCSS 插件 |
| `src/app/layout.tsx` | 根布局与 metadata |
| `src/app/page.tsx` | 首页 |
| `src/app/globals.css` | Tailwind 入口 |

## 注意事项

- 这是唯一需要 SEO 的应用：内容页优先 server component，**不要一律加 `"use client"`**。
- 数据获取优先在服务端完成；只有交互部分才下沉成 client component。
- `/api` 由 `next.config.ts` 的 rewrites 代理到后端，代码里不写后端域名。
- `packages/*` 是 TS 源码，已在 `transpilePackages` 里声明，新增共享包要同步加进去。
- `.next/` 是构建产物，已在 `.gitignore` 中，不要提交。
