# 管理端引入 Mantine — 开发日志（阶段 3）

## 待确认项结论

全按 PRD 默认假设推进：Q1 只装 `@mantine/core` + `@mantine/hooks`；Q2 改写现有基础页作 Mantine 样板（保留原功能）；Q3 不启用深色模式。

## 任务完成情况

| 编号 | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| T1 | 改写硬规则 | `templates/base/AGENTS.md` | 第 16 行改为分端约定：admin 可用 Mantine，client/portal 仍只用 Tailwind |
| T2 | 安装与接入 Mantine | `apps/admin/package.json`、`src/index.css`、`src/main.tsx` | 依赖就位、preset 替代 `@import "tailwindcss"`、入口导入 Mantine 样式、App 被 `MantineProvider` 包裹 |
| T3 | 样式分工规范 | react skill、conventions、CHANGELOG | 三处全部命中，写明「Mantine 管交互控件 / Tailwind 管布局微调」 |
| T4 | 样板页改写 | `apps/admin/src/App.tsx` | 用 `Container/Paper/Title/Badge/Loader/Alert/Table` 渲染，保留 health/todos/加载/错误态 |
| T5 | 静态验证 | — | 见下 |

## 验证结果

| 验证 | 结果 |
| --- | --- |
| `pnpm build` | 通过。6 子项目构建 + 全量 typecheck。admin CSS 由约 6KB 增至 510KB（Mantine 样式）；client 产物哈希未变 |
| `pnpm lint` | 通过（oxlint） |
| `pnpm typecheck` | 通过（含 admin 样板页的 Mantine 组件类型） |
| 边界检查 | grep `mantine` 在 `apps/client` 与 `apps/portal`：零匹配，二者 package.json 与 CSS 未变 |

## 版本偏差说明

官网文档显示 Mantine v9.8.2，但本机 npm 环境强制走 `npmmirror` 镜像，镜像只同步到 9.8.1（官方源 `registry.npmjs.org` 确有 9.8.2）。`npm_config_registry` 环境变量与项目 `.npmrc` 均未能覆盖镜像设置。

最终声明 `^9.8.1`：镜像可安装，且 `^` 允许将来解析到 9.8.2（API 一致）。未为此改动用户全局配置。

## 遗留

- 深色模式未启用（按 Q3 默认，Mantine 开箱支持，后续按需开启）。
- 尚未做浏览器视觉验证；样板页功能与类型已由 build/typecheck 覆盖，样式共存由 preset 的 layer 顺序保证。
