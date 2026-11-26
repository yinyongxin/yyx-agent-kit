# 采用官方预制布局 + 接入 LLM 支持 交付记录

## 概览

- 状态：已交付（阶段 4 未独立执行）
- 周期：2026-11-24 ~ 2026-11-26
- 参与角色：chief（产品/技术）、coder（主会话）、archivist

## 需求背景

前两轮只查了 mantine.dev 主站，漏了 ui.mantine.dev 的现成组件生态与官方 LLM 支持（踩坑 #19 同类）。用户指出后复用官方预制布局，并接入 MCP 与 agent skills 以获取最新官方用法。

## 关键决策（ADR）

### ADR-1 复用 ui.mantine.dev 官方组件，不手写

- 背景：手写 AppShell + NavLink 被用户指出「有现成设计为什么不用」
- 选项：A 手写 / B 复制官方组件（MIT）适配
- 结论：选 B，采用 `NavbarNested`/`LinksGroup`/`DoubleNavbar`/`HeaderMenu`/`HeaderMegaMenu`，`export const` 适配、子链接用 TanStack `Link`
- 理由：官方设计更专业、随主题一致；适配器由我们维护，第三方样式不复制逻辑
- 影响：`src/components/header/`、`src/components/navbar/`、`postcss.config.cjs`
- 状态：有效

### ADR-2 四种布局可切换

- 背景：用户要求 nested / double / header-menu / header-mega-menu 都能切
- 结论：右上角浮动按钮循环切换（所有模式可见）；后续按用户要求去掉 Header，仅保留 Navbar + Content 两栏
- 理由：一个入口覆盖四种模式；浮动按钮不受布局形态影响
- 影响：`AdminLayout.tsx`
- 状态：有效

### ADR-3 MCP 随项目走，skills 不随项目走

- 背景：Mantine 官方有三种 LLM 接入方式（llms.txt / MCP / skills）
- 结论：MCP 配进模板 `.opencode/opencode.json`（新项目自带）；三个 skills 装用户全局并在 `docs/guides/conventions.md` 记录安装命令，不复制进仓库
- 理由：MCP 动态拉最新文档；第三方 skills 复制会固化版本、失去官方更新
- 影响：`templates/base/.opencode/opencode.json`、`docs/guides/conventions.md`
- 状态：有效

## 交付物

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| 技术方案 / 开发日志 | `02-tech-design.md`、`03-dev-log.md` | 阶段 1+2 合并 |
| 布局组件 | `templates/base/apps/admin/src/components/header/`、`navbar/` | 四种官方布局，各含 barrel |
| MCP 配置 | `templates/base/.opencode/opencode.json` | `mantine` server |
| 规范 | `docs/guides/conventions.md` 第 6 节、react skill、`docs/CHANGELOG.md` | 查文档方式与 skills 安装 |
| 视觉证据 | `D:/opencode-poc/ego-admin/mode-{0,1,2,3}.png`（临时目录，不入库） | 四模式循环切换验证 |

## 验证结论

`typecheck` / `lint` 通过（typecheck 抓到并修复两处数组索引可能 undefined 的真实类型错误）；ego-browser 连续切换四次，snapshot 逐模式确认渲染正确。`pnpm build` 曾因本机内存不足在 Rolldown 阶段 OOM（同样代码之前能过，属环境限制）。**未做独立阶段 4**。

## 遗留与风险

| 项 | 影响 | 建议处理时机 |
| --- | --- | --- |
| `pnpm build` 本机 OOM | 全量构建未在本机最终确认 | 高内存环境重跑 |
| skills 未绑项目 | 换机器需重装（命令已记规范） | 新环境按规范安装 |
| 后续 pull 已重构组件目录 | 组件改成目录 + barrel 形式 | 以当前代码为准 |

## 下次接手

先读 `docs/guides/conventions.md` 第 6 节与 `03-dev-log.md`；四种布局组件当前已是 `header/<Name>/`、`navbar/<Name>/` 目录形式（含 `index.tsx`），导入按 barrel。
