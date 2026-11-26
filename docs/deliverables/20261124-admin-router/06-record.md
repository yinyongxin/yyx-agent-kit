# 管理端路由与菜单布局 交付记录

## 概览

- 状态：已交付（阶段 5 未独立执行）
- 周期：2026-11-24 ~ 2026-11-26
- 参与角色：chief（产品/技术）、coder（主会话）、archivist

## 需求背景

管理端此前是单页 `App.tsx`，health 与 todos 挤在一屏，无路由无导航。需建立 file-based 路由 + 菜单布局，为后续多页打底。

## 关键决策（ADR）

### ADR-1 用 TanStack Router 的 file-based 模式

- 背景：react skill 已定 `@tanstack/react-router`，模板未装
- 选项：A file-based / B code-based / C React Router
- 结论：选 A，Vite 插件自动生成 `routeTree.gen.ts`
- 理由：新增页面只需加文件，类型安全最强，符合既定技术栈
- 影响：`package.json`、`vite.config.ts`（`tanstackRouter` 必须在 `react()` 之前）、`routeTree.gen.ts`（生成物不手改）
- 状态：有效

### ADR-2 页面组件移出路由文件

- 背景：初版在路由文件里 `export const Route` 先于 `export const HomePage`，运行时 TDZ 报错，且破坏 code-splitting
- 选项：A 调整声明顺序 / B 页面移到 `src/pages/`、路由文件只导入组件
- 结论：选 B
- 理由：根治 TDZ，且每个页面独立 chunk（构建产物已确认）
- 影响：`src/pages/`、`src/routes/`
- 状态：有效

### ADR-3 菜单 7 项 3 组

- 背景：用户逐项确认菜单项与布局形态
- 结论：首页/工作台｜用户/角色/租户/权限｜设置，可折叠左侧导航 + 内容区，设置页占位
- 理由：覆盖权限系统各域，便于后续填真实内容
- 状态：有效

## 交付物

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| PRD / 技术方案 / 开发日志 | `01-prd.md`、`02-tech-design.md`、`03-dev-log.md` | 完整三件 |
| 路由与页面 | `templates/base/apps/admin/src/routes/`、`src/pages/` | 后续被 pull 重构为 `routes/access/*` + `features/` 分层 |
| 规范 | react skill、`docs/CHANGELOG.md`、`.gitignore`（排除 `routeTree.gen.ts`） | 路由约定 |
| 视觉证据 | `D:/opencode-poc/ego-admin/router-*.png`（临时目录，不入库） | 7 路由导航验证 |

## 验证结论

`pnpm build` / `lint` / typecheck 通过；ego-browser 逐页验证 7 条路由、菜单高亮、折叠、错误态（详见 `03-dev-log.md`）。**未做独立阶段 5**。后续 pull 把路由改到 `/access/*`，本地 `routeTree.gen.ts` 为生成物需重新生成后才 typecheck 通过（已处理，见 `docs/guides/conventions.md` 第 7 节）。

## 遗留与风险

| 项 | 影响 | 建议处理时机 |
| --- | --- | --- |
| 路由守卫 / 菜单权限过滤未做 | 所有菜单项对所有人可见 | 后端认证接入管理端后 |
| 用户/角色/租户/权限页为占位 | 不接真实数据 | 按业务优先级 |

## 下次接手

先读 `docs/guides/conventions.md` 第 7 节的 admin 目录结构与「改路由先生成 routeTree」规则；历史 `src/pages/` 已被 `features/` 分层替代，以当前代码为准。
