# 管理端引入 Mantine — 测试计划（阶段 5）

输入：`01-prd.md`（F1-AC1 ~ F5-AC1 共 9 条验收标准）、`02-tech-design.md`（影响面）、`03-dev-log.md`（改动清单）。
执行者：qa（独立于实现者）。判定依据：PRD 验收标准 + 实际命令执行结果，不采信「开发说已通过」。

## 1. 测试范围与边界

- **覆盖**：F1~F5 全部 9 条 AC；按改动文件推导的回归面（client/portal 依赖与样式未变、admin 其它源码组件写法）。
- **验证方式**：静态检查（grep / 文件内容核对） + 命令执行（`pnpm build` / `pnpm lint` / `pnpm typecheck`）。
- **不适用（本期非目标，PRD 3.2 / 3.3）**：浏览器视觉验证由主会话执行，qa 不做；需求不涉及数据库/接口变更，不因本机无 Docker 判定阻塞；无单测脚本，不执行单测。
- **环境基线**：分支 `main`，仓库根 `D:\project\yyx-agent-kit`，工作目录 `templates/base`；pnpm 11.9.0；命令前设置 `$env:CI="true"; $env:npm_config_store_dir="D:\pnpm-store"; $env:npm_config_minimumReleaseAge="0"`。
- **命令分隔**：PowerShell 5.1 不支持 `&&`，统一用 `;` 分隔。

## 2. 用例设计

编号规则：与 PRD AC 对齐，`TC-<功能>-<序号>`；`TC-REG-*` 为回归补充用例。优先级 P0 / P1 / P2 对齐缺陷等级口径。

| 编号 | 关联 AC | 前置 | 步骤 | 预期 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| TC-F1-01 | F1-AC1 | 已读取 `templates/base/AGENTS.md` | 查看「硬性规则」第 16 行及上下文 | 写明 admin 允许 Mantine；client/portal 不引入第三方 UI 组件库、只用 Tailwind 原子类；并指向 `docs/guides/conventions.md`「前端样式与组件库」 | P0 |
| TC-F1-02 | F1-AC1 | 同上 | grep「不引入第三方 UI 组件库」「export const」「原生 fetch」「页面文件」 | 禁用规则仅约束 client/portal；`export const` 写法、原生 fetch、页面目录等其它前端约定均保留，未被放宽 | P1 |
| TC-F2-01 | F2-AC1 | 已读取 `apps/admin/package.json` | 检查 dependencies / devDependencies | 含 `@mantine/core`、`@mantine/hooks`（版本 ^9.x），devDependencies 含 `tailwind-preset-mantine`；无 form/notification/chart 等扩展包 | P0 |
| TC-F2-02 | F2-AC1 | 已读取 client/portal 的 package.json | grep `mantine`（忽略大小写）于两文件；并查 `git status --short` | 两端 package.json 零命中；git 修改列表不含 client/portal 任何文件 | P0 |
| TC-F2-03 | F2-AC2 | 已读取 `apps/admin/src/main.tsx` | 检查 import 顺序与 JSX 结构 | 导入 `@mantine/core/styles.css` 与 `MantineProvider`；`<StrictMode>` 内 `<MantineProvider>` 包裹 `<App />`；顺序为样式导入 → Provider → App | P0 |
| TC-F2-04 | F2-AC2 | 已读取 `apps/admin/src/index.css` | 查看文件内容 | 仅 `@import "tailwind-preset-mantine";`，不再含 `@import "tailwindcss";` | P0 |
| TC-F2-05 | F2-AC3 | workspace 依赖已安装 | 在 `templates/base` 执行 `pnpm build` | 退出码 0；6 子项目构建 + 全量 typecheck 全部通过；无 Tailwind preflight 覆盖 Mantine / layer 顺序冲突报错 | P0 |
| TC-F3-01 | F3-AC1 | 已读取 `docs/guides/conventions.md` | 查找样式分工章节 | 存在独立分类（第 6 节「前端样式与组件库」），写明 Mantine 管交互控件、Tailwind 管布局微调、`tailwind-preset-mantine` 对齐主题与 layer、只装按需包、`export const` 写法 | P0 |
| TC-F3-02 | F3-AC2 | 已读取 `apps/admin/src/App.tsx` | grep `export default`、`function`；确认组件导出 | 全部为 `export const`；无 `export default`、无 `function` 声明 | P1 |
| TC-F3-03 | F3-AC2 | 已定位 admin 源码目录 | 对 `apps/admin/src/**/*.tsx` grep `export default` 与 `function <Name>(` | admin 全部 TSX 组件遵守 `export const`，无违规写法（回归：规则影响面） | P1 |
| TC-F4-01 | F4-AC1 | 已读取 react skill | grep `Mantine` 于 `skills/standards/react/SKILL.md` | 命中且写明仅 admin 可用、Mantine/Tailwind 分工、preset 对齐、`export const` 不变 | P1 |
| TC-F4-02 | F4-AC1 | 已读取 CHANGELOG | grep `Mantine` 于 `docs/CHANGELOG.md` | 命中本次管理端 UI 选型记录（含只限 admin、分工、preset、client/portal 仍 Tailwind） | P1 |
| TC-F5-01 | F5-AC1 | workspace 依赖已安装 | 在 `templates/base` 执行 `pnpm lint` | 退出码 0，oxlint 无 error/warning | P0 |
| TC-F5-02 | F5-AC1 | workspace 依赖已安装 | 执行 `pnpm typecheck`（亦由 `pnpm build` 覆盖） | 退出码 0，含 admin 样板页 Mantine 组件类型检查通过 | P0 |
| TC-F5-03 | F5-AC1 | 已读取 `apps/admin/src/App.tsx` | grep `health` / `todos` / `loading` / `error` 及对应 JSX | 保留 health 探活展示、todos 列表、加载态（Loader）、错误态（Alert）；仅 UI 表达替换，数据流仍走 `api.health()` / `api.todos()` | P0 |
| TC-F5-04 | F5-AC1 | 同上（边界/异常态核查） | 逐项检查状态渲染分支 | loading 时显示 Loader；error 时显示 Alert 且不再渲染 health Badge；成功且 todos 为空显示「暂无数据」；todos 非空渲染 Table；health 非 `ok` 显示红色 Badge | P1 |
| TC-REG-01 | F2-AC1 / F2-AC3（回归） | 已取得 git 基线与 diff | `git diff --name-only` 与 `git status --short` 过滤 client/portal；读取两端 CSS | 两端 package.json 与 CSS 均无改动、无 mantine 引用；构建未被污染 | P0 |
| TC-REG-02 | F2-AC1（边界） | 已读取 admin/package.json 与 lockfile | 检查依赖清单只含按需包 | 仅 `@mantine/core` + `@mantine/hooks` + `tailwind-preset-mantine`，未一键引入全部扩展 | P2 |

## 3. 回归范围判定

由 `03-dev-log.md` 改动文件推导：

- 改了 `AGENTS.md` / react skill / conventions / CHANGELOG → 规范一致性回归（TC-F1-01/02、TC-F3-01、TC-F4-01/02）。
- 改了 `apps/admin/package.json` / lockfile → 依赖范围回归（TC-F2-01、TC-F2-02、TC-REG-01、TC-REG-02）与全量构建回归（TC-F2-05）。
- 改了 `admin/src/index.css` / `main.tsx` → 样式入口与 Provider 接入（TC-F2-03/04）、样式冲突检查（TC-F2-05）。
- 改了 `admin/src/App.tsx` → 样板功能与写法（TC-F3-02、TC-F3-03、TC-F5-03/04）、lint/typecheck（TC-F5-01/02）。
- client / portal 明确「完全不动」→ 定向验证零改动（TC-F2-02、TC-REG-01）。
