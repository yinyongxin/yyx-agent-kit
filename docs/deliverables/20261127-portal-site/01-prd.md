# yyx-agent-kit 门户站 PRD

## 1. 背景与目标

`templates/base/apps/portal` 目前是占位页（标题 + 构建时间），但它是模板里唯一面向 SEO 和未登录访客的站点。脚手架要对外可用，需要一个能讲清产品价值、引导安装使用的门户。

一句话目标：**把占位页换成一套精致科技感的产品门户，用真实项目信息讲清价值并引导安装，服务端渲染利于 SEO。**

## 2. 用户与场景

- **开发者访客**：搜索到 yyx-agent-kit，想快速了解它解决什么问题、怎么安装
- **技术决策者**：想确认技术栈与工程规范是否契合自己的团队
- **当前替代方案**：读 GitHub README（信息全但不够直观）；没有官网介绍页

## 3. 范围

### 3.1 本期做

- F1 门户首页：Hero + 核心特性 + 五阶段流水线 + 技术栈规范 + CLI 用法 + FAQ + CTA
- F2 安装引导区：`pnpm dlx yyx-agent-kit` 真实命令 + 参数说明
- F3 SEO 基础：metadata（title / description / openGraph）合理设置
- F4 服务端渲染：默认 Server Component，无需客户端 JS 的部分不标 `"use client"`
- F5 响应式：移动端与桌面端布局

### 3.2 明确不做（非目标）

- 不做博客 / 文档站（后续需求）
- 不做登录态（门户面向未登录访客）
- 不改 admin / client / server
- 不引入组件库（portal 只用 Tailwind 原子类）
- 不做多语言 / 主题切换
- 不接真实后端接口（内容静态，写死在组件里）

### 3.3 依赖与假设

- Next.js 16 App Router + Tailwind 4，沿用 `next` skill 约定
- 内容基于 yyx-agent-kit 真实信息（来自本仓库 README / conventions / CLI）
- 构建基线：portal 曾因 OOM 加过 `enablePrerenderSourceMaps: false` 与 `typescript.ignoreBuildErrors: true`，保持不变
- 视觉方向：精致科技感（深色/中性、等宽字体点缀代码感、清晰网格与留白），与 OpenCode 官方设计规范一致

## 4. 功能清单

| 编号 | 功能 | 优先级 | 说明 |
| --- | --- | --- | --- |
| F1 | 门户首页内容区 | P0 | 单页多区块，内容真实 |
| F2 | 安装引导区 | P0 | 命令 + 参数，可复制 |
| F3 | SEO metadata | P1 | title / description / openGraph |
| F4 | 服务端渲染 | P0 | 默认 Server Component |
| F5 | 响应式布局 | P0 | 移动 + 桌面 |

## 5. 详细需求

### F1 首页内容区

单页顺序：Hero → 核心特性（6 项）→ 五阶段流水线 → 技术栈规范（4 项）→ CLI 用法 → FAQ → 最终 CTA → Footer。所有内容用真实项目信息，禁止 lorem ipsum。

### F2 安装引导区

展示 `pnpm dlx yyx-agent-kit myapp -p D:\projects`，并列出参数：项目名 / `-p` / `--port-base` / `-f`。终端风格块，等宽字体。

### F3 SEO metadata

`layout.tsx` 的 `metadata` 设 title（含产品名）、description、openGraph（title / description / type: website）。不手写 `<head>`。

### F4 服务端渲染

全页默认 Server Component；不需要交互的部分不加 `"use client"`。日期不在渲染时取 `new Date()`（避免静态/服务端不一致），改为固定文案或不展示构建时间。

### F5 响应式

用 Tailwind 响应式类：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`，导航在移动端简化。

## 6. 验收标准

```
F1-AC1
Given 访问门户首页 /
When  查看页面内容
Then  依次出现 Hero、6 项特性、五阶段流水线、4 项技术栈、CLI 用法、FAQ、CTA、Footer，且内容均为真实项目信息

F1-AC2
Given 页面 HTML
When  查看源码
Then  无 lorem ipsum、无占位图片、无 TODO 文案

F2-AC1
Given 安装引导区
When  查看
Then  显示 `pnpm dlx yyx-agent-kit myapp -p D:\projects` 与四个参数说明

F3-AC1
Given 首页 HTML 的 <head>
When  检查 metadata
Then  title 含 yyx-agent-kit，description 非空，存在 og:title / og:description / og:type

F4-AC1
Given portal/src/app/page.tsx
When  检查组件声明
Then  无 "use client"，无 new Date()

F5-AC1
Given 移动端与桌面端视口
When  查看布局
Then  栅格随断点变化，无横向滚动
```

## 7. 非功能要求

- 只用 Tailwind 原子类，不引入 Mantine 或其它 UI 库
- 组件写法遵循约定：页面文件保留 `export default function`（Next 路由约定），内部展示组件用 `export const`
- 构建通过：`pnpm --filter @starter/portal build` 与全量 typecheck

## 8. 埋点与度量

本期静态门户，无埋点。验证度量：build / typecheck 通过、页面可访问、metadata 正确。

## 9. 待确认问题

| 编号 | 问题 | 默认假设 | 影响面 |
| --- | --- | --- | --- |
| PQ1 | 是否做深色模式 | 不做，保持单一浅色科技感 | F1 / F5 |
| PQ2 | GitHub / npm 链接是否用真实地址 | 用 `github.com/yinyongxin/yyx-agent-kit` 与 npm 包名 | F1 CTA |
| PQ3 | 是否展示构建时间 | 不展示（服务端/静态不一致风险） | F1 |
