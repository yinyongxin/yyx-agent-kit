# app

## 职责

Next.js App Router 目录，文件系统即路由。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `layout.tsx` | 根布局，挂全局样式与 metadata |
| `page.tsx` | 首页（`/`），组装各区块组件 |
| `globals.css` | Tailwind 入口 + 门户设计系统 token（`:root` 变量） |
| `components/` | 门户展示组件，按区块拆分，详见该目录 README |

## 注意事项

- 默认是 server component；需要 `useState` / `useEffect` / 事件时才加 `"use client"`，并且尽量下沉到叶子组件。
- 新增路由用 `<段名>/page.tsx`，不要把所有逻辑堆在首页。
- 服务端组件里不要直接用 `window`、`localStorage`。
