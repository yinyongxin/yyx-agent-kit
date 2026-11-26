# 管理端引入 Mantine 交付记录

## 概览

- 状态：已交付（阶段 4 通过）
- 周期：2026-11-24 ~ 2026-11-26
- 参与角色：chief（产品/技术）、coder（主会话）、qa（独立回归）、archivist

## 需求背景

管理端此前纯 Tailwind 手写所有 UI，表单/弹窗/通知/日期等重复劳动多。现有硬规则「不引入第三方 UI 组件库」挡路，需按端差异化放开并立清与 Tailwind 的分工。

## 关键决策（ADR）

### ADR-1 仅管理端引入 Mantine

- 背景：client/portal 有品牌/SEO 约束，不适合引入组件库
- 选项：A 全端引入 / B 仅 admin 引入 / C 保持现状
- 结论：选 B，硬规则改为「admin 允许 Mantine，client/portal 不引入第三方 UI 组件库」
- 理由：管理端是内部系统，交互组件收益最大；其它端保持极简
- 影响：`AGENTS.md` 第 16 行、`docs/guides/conventions.md` 第 6 节
- 状态：有效

### ADR-2 Mantine 管交互控件、Tailwind 管布局微调

- 背景：两套样式系统容易打架
- 选项：A 纯 Mantine / B 分工 + preset 对齐
- 结论：选 B，`tailwind-preset-mantine` 对齐主题变量与 layer 顺序
- 理由：避免 preflight 覆盖组件样式，不用 `!important` 硬压
- 影响：`index.css`、`main.tsx`、样板页
- 状态：有效

### ADR-3 版本声明 `^9.8.1`

- 背景：官网 9.8.2，本机镜像只同步到 9.8.1，环境变量覆盖不了 registry
- 结论：声明 `^9.8.1`（镜像可装，`^` 允许将来升 9.8.2）
- 理由：不跟环境硬扛、不改用户全局配置
- 状态：有效

## 交付物

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| PRD / 技术方案 / 开发日志 | `01-prd.md`、`02-tech-design.md`、`03-dev-log.md` | 完整三件 |
| 测试计划 / 报告 / 视觉验证 | `04-test-plan.md`、`04-test-report.md`、`04-visual-check.md` | 18/18 通过，0 缺陷 |
| 样板页 | `templates/base/apps/admin/src/App.tsx` | Mantine 组件 + Tailwind 布局 |
| 规范 | `AGENTS.md`、react skill、`docs/guides/conventions.md` 第 6 节、`docs/CHANGELOG.md` | 分端约定与分工 |

## 验证结论

qa 独立回归：18/18 用例通过，9 条 AC 全覆盖，0 缺陷、0 阻塞；`pnpm build` / `lint` / `typecheck` 通过；ego-browser 视觉验证 Mantine 与 Tailwind 共存正常（详见 `04-test-report.md`、`04-visual-check.md`）。后端 502 为环境限制（无 Docker），非 UI 缺陷。

## 遗留与风险

| 项 | 影响 | 建议处理时机 |
| --- | --- | --- |
| 深色模式未启用 | Mantine 开箱支持但未开 | 按需 |
| 后端真实 200 路径未验证 | 页面只验证到错误态 | 有 Docker 的环境 |

## 下次接手

先读 `04-test-report.md` 的结论与 `docs/guides/conventions.md` 第 6 节；注意本需求的样板页已被后续路由/布局需求重构（见 `20261124-admin-router`、`20261124-mantine-ui-mcp`）。
