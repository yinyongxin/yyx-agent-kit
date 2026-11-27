# components

## 职责

门户首页的展示组件，按区块拆分。除 FAQ 外均为 server component。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `ui.tsx` | Kicker / SectionTitle / GradientIcon 设计系统原子组件 |
| `site-nav.tsx` | 毛玻璃胶囊导航（backdrop-blur） |
| `hero.tsx` | Hero：CSS 渐变光晕、居中双行标题、双 CTA、浮动小卡 |
| `trust.tsx` | 技术栈 logo 行 |
| `features.tsx` | 6 项核心特性卡片 |
| `workflow.tsx` | 五阶段交付流水线卡片 |
| `stack.tsx` | 技术栈 2×2 卡片 |
| `cli.tsx` | CLI 终端展示与参数表 |
| `faq.tsx` | FAQ 手风琴（唯一 `"use client"` 组件） |
| `cta.tsx` | 红橙渐变 CTA 与表单展示 |
| `site-footer.tsx` | 深色页脚 |
| `index.ts` | 统一导出，外部只从目录路径导入 |

## 注意事项

- 组件统一 `export const`，不用 `function` 声明、不用 `export default`（`page.tsx` 是 Next 路由入口例外）。
- 设计 token 定义在 `../globals.css` 的 `:root`，对应 Penpot 画板「门户首页 · Aigocy 风格 1440」；类名用 Tailwind arbitrary values 引用变量。
- 新增区块后在 `index.ts` 补导出，再到 `../page.tsx` 组装。
