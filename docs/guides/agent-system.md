# Agent 系统与 Skills 说明

> 读完后你应该能回答：**谁在哪个阶段做什么、产出什么文件、卡在哪道门禁、新项目和全局配置怎么同步。**
> 本文只讲现状与用法，不重复各 skill 内部的详细规则；要改规则时再去看对应文件。

## 0. 30 秒总览

这个仓库不是产品代码，而是给 OpenCode 用的「**角色 + 规范 + 项目模板**」源仓库。三样东西各管一件事：

| 目录 | 管什么 | 一句话 |
| --- | --- | --- |
| `agents/` | **谁来做** | chief 总管做设计与方案、派活；qa 独立测试 |
| `skills/` | **怎么做** | 5 个流程 skill + 4 个工程规范 skill + 1 个工具 skill |
| `templates/base/` | **从哪开始** | 新项目的目录结构、Docker、认证、路由、Prisma 骨架 |

一个需求按固定五阶段推进，**每阶段产出文件，文件齐了才准进下一阶段**。进度靠 `docs/deliverables/<slug>/` 里实际存在的文件判断，不靠记忆。

```text
用户说「做个 X」
   │
   ▼
chief（总管，primary agent）判断阶段、守门禁
   ├─ 阶段1 产品设计（chief 自己 + prd skill）
   │     → 01-prd.md + 01-wireframe.md + 01-interaction.md
   ├─ 阶段2 技术方案（chief 自己 + tech-design skill）
   │     → 02-tech-design.md
   ├─ 阶段3 开发实施（派 general subagent）
   │     → 代码 + 03-dev-log.md
   ├─ 阶段4 测试回归（派 qa subagent）
   │     → 04-test-plan.md + 04-test-report.md
   └─ 阶段5 记录归档（chief 自己 + archive skill）
         → 05-record.md + docs/README.md
```

## 1. 角色：agents

仓库里只有两个 agent 文件，第三个角色是 OpenCode 内置的。

| 角色 | 文件 | 模式 | 负责阶段 | 关键约束 |
| --- | --- | --- | --- | --- |
| **chief** | `agents/chief.md` | primary（默认入口） | 1、2、5；派活给 3、4 | 只能派 `qa` 和 `general`；阶段 1、2 必须自己做（上下文连续）；守全部门禁 |
| **qa** | `agents/qa.md` | subagent | 4 | 判定者独立于实现者；不改业务代码，只改测试文件；结论不确定就写「阻塞」 |
| **general** | 无文件（OpenCode 内置 subagent） | subagent | 3 | 由 chief 派发；prompt 必须写清 slug、交付目录、先读文件、目标、禁止事项 |

### chief 每次接任务固定做三件事

1. 定需求代号 `slug`：用户给了就用，没给就生成 `YYYYMMDD-简短英文名`（如 `20261126-makeup-miniapp`）。
2. 用 glob 查 `docs/deliverables/<slug>/` 已有文件，**用文件判断真实进度**。
3. 加载 `product-pipeline` skill，按阶段表和门禁执行。

### chief 的汇报格式

每阶段结束只回四行：**阶段 / 产出 / 待确认 / 下一步**。
除非用户明确说「一次做完、不用问我」，否则每道门禁都停下等确认；需求矛盾或方案与 PRD 冲突时也停下问用户。

## 2. 五阶段流水线与门禁

所有交付物都在 `docs/deliverables/<slug>/` 一个目录里。

| 阶段 | 负责人 | 交付物 | 准出标准 | 进入下一步的硬条件 |
| --- | --- | --- | --- | --- |
| 1 产品设计 | chief + `prd` | `01-prd.md`、`01-wireframe.md`、`01-interaction.md` | 每条功能有可判定验收标准；三件套通过交叉自检；非目标写明、假设单列 | 三件套齐备 + 自检通过 + **用户确认** → 才能做方案（阶段 1、2 必须同一人） |
| 2 技术方案 | chief + `tech-design` | `02-tech-design.md` | 逐条给可行性结论，无「需调整」「不可做」 | 全部「可做」+ 文件存在 → 才能派 general；出现「需调整/不可做」→ 回 PRD 修订重评 |
| 3 开发实施 | general | 代码 + `03-dev-log.md` | 任务完成；typecheck / lint / build 通过 | dev-log 任务完成 → 才能派 qa |
| 4 测试回归 | qa | `04-test-plan.md`、`04-test-report.md` | 报告结论「通过」，无未处理高优缺陷 | 结论=通过 → 才能归档 |
| 5 记录归档 | chief + `archive` | `05-record.md`、`docs/README.md` | 决策与遗留项可追溯、索引入口正确 | 每道门禁通过后即可追加一条记录，不必等全部做完 |

### 门禁为什么这样设

| 门禁 | 防止的风险 |
| --- | --- |
| 没三件套不许做方案 | 没想清楚页面显示什么、怎么联动就开工 |
| 方案有「需调整/不可做」必须回 PRD | 产品拍脑袋、开发接不住，中途返工 |
| 没有通过评审的方案不许派 general | 开发自己定义需求 |
| 没有 dev-log 不许派 qa | 回归范围无从推导 |
| 报告不通过不许归档 | 缺陷被埋进历史 |

### 可行性回退（关键机制）

阶段 2 必须逐条对照 PRD 功能编号给结论：

| 功能 | 可行性 | 依据 | 若不可行的替代 |
| --- | --- | --- | --- |
| F1 | 可做 | 现有模块可直接扩展 | — |
| F2 | 需调整 | 现有字段不支持，需加迁移 | 把 AC2 改为… |
| F3 | 不可做 | 依赖的第三方接口未提供 | 本期砍掉，列非目标 |

出现「需调整」或「不可做」→ 回 `01-prd.md` 修订 → 重新评审 → 不带疑问进开发。

## 3. Skills：10 个，分三类

Skill ID = 目录名。加载靠 description 自动匹配，不用手写配置。

### 3.1 流程类 `skills/flows/`（5 个，对应阶段）

| Skill | 什么时候加载 | 目标产出 | 要点 |
| --- | --- | --- | --- |
| `product-pipeline` | 「做个 X」「推进需求」「现在到哪一步」「能开工/测试/归档吗」 | 各阶段文件 | 五阶段表、门禁顺序、按文件判断进度；小需求可合并 1+2 但须在方案顶部写需求与验收；大需求拆多 slug 用 `docs/README.md` 串 |
| `prd` | 「写 PRD」「功能具体怎么做」「需求文档」 | 三件套：`01-prd.md` / `01-wireframe.md` / `01-interaction.md` | PRD 固定 9 节；AC 用 Given/When/Then 且可判定；编号只增不改；**产出后强制交叉自检 7 条** |
| `tech-design` | 「能不能做」「怎么拆任务」「用什么框架」 | `02-tech-design.md` | 固定 12 节；可行性三选一；任务必须「一件事、文件可枚举、依赖编号、可独立验证」 |
| `qa-regression` | 「测一下」「验收」「跑回归」「能上线吗」 | `04-test-plan.md` / `04-test-report.md` | 用例编号对齐 AC；等价类+边界；回归范围按 dev-log 改动推导；缺陷分 P0–P3 |
| `archive` | 「归档」「记录决策」「更新索引」 | `05-record.md` / `docs/README.md` | 追加不覆盖；只记事实；只留路径不粘日志；可交接 |

### 3.2 工程规范类 `skills/standards/`（4 个，约束代码不产文档）

| Skill | 什么时候加载 | 管什么 |
| --- | --- | --- |
| `workspace` | 所有项目；chief 派 general 时必带 | pnpm、mise、monorepo 结构、端口 47xxx、构建产物、PM2、Docker（PostgreSQL+pgvector / Redis）、**数据库变更强制 migrate 禁 push** |
| `nestjs` | 开发 NestJS 后端 | NestJS 12 + TS 6、Prisma 7 多文件 schema、官方认证授权、默认拒绝、多租户 extension、RBAC 五表 |
| `react` | 开发 React 前端 | Vite + admin 用 Mantine+Tailwind、client/portal 只用 Tailwind、TanStack Router file-based、组件写法、原生 fetch |
| `next` | 开发 Next.js 门户 | 仅 SEO/首屏场景用；默认 Server Component；metadata、取数与缓存、`transpilePackages` |

### 3.3 工具类 `skills/tools/`（1 个）

| Skill | 什么时候加载 | 管什么 |
| --- | --- | --- |
| `tooling` | 要用 ardot / opencode CLI / 第三方 MCP 时 | **先探测再调用**（`--help`、列 MCP 工具名）；失败不伪造；ego-browser 为浏览器首选（含 handOff 交还用户）；用 ego 查官网 + 官方脚手架；token/cookie 不入文档 |

## 4. 文件是怎么流转的

```text
docs/deliverables/<slug>/
├── 01-prd.md               chief 写：做什么、验收标准
├── 01-wireframe.md         chief 写：页面上显示什么
├── 01-interaction.md       chief 写：页面怎么联动、状态机
├── 02-tech-design.md       chief 写：可行性结论 + 任务拆分
├── 03-dev-log.md           general 写：改了什么
├── 04-test-plan.md         qa 写：用例
├── 04-test-report.md       qa 写：结论 + 缺陷
├── 04-visual-check.md      可选：视觉/浏览器验证
└── 05-record.md            chief 写：决策与遗留
```

全局索引 `docs/README.md` 在 docs 根目录，按 slug 串起所有交付物。

**编号是跨阶段唯一连接键**：`F1`、`F2` 是功能编号；`AC` 是验收标准；`I/G/E/Q` 是交互/规则/异常/待确认编号。编号只增不改，废弃就保留并标注「已废弃」，不回收再用——因为改一次编号，下游四份文档都要同步改。

## 5. 同步机制：agents、skills、模板各走各的路

这是最容易搞混的部分。

| 内容 | 源在哪 | 怎么生效 |
| --- | --- | --- |
| **全局 agents** | 仓库 `agents/*.md` | 跑 `scripts/sync.ps1` 复制到 `C:\Users\Administrator\.config\opencode\agents\`；按 `.synced.json` 清理已删除的残留；首次新建目录需 `opencode service restart`，之后 `/reload` |
| **模板里的 agents** | 同上 | `templates/base/.opencode/agents/` 是快照副本，README 注明「别手改，会被覆盖」；同步命令加 `-ConfigDir templates\base\.opencode` |
| **全局 skills** | 仓库 `skills/standards/` | 全局 `~/.config/opencode/skills/standards` 是指向仓库的 **junction**，改完 `/reload` 即可；流程和工具类 skill 不进全局 |
| **新项目 skills/agents** | 仓库 `skills/` + `agents/` | CLI 生成项目时整目录复制进 `.opencode/`，项目自包含，不依赖 CLI 安装位置 |
| **模板配置** | `templates/base/.opencode/opencode.json` | `skills: ["../../skills"]` 指向仓库（仓库内开发）；CLI 生成时改成 `".opencode/skills"` |
| **第三方 skills** | 如 Mantine 官方 skills | 装在 `~/.agents/skills`，**不随项目走**，换机器要重装；MCP 配置随模板走 |

## 6. 几个常用场景怎么做

| 场景 | 做法 |
| --- | --- |
| 开始一个新需求 | 跟 chief 说「做个 X」→ 它定 slug、查已有文件、从阶段 1 开始，每道门禁停下等你确认 |
| 用 npm 创建新项目 | `pnpm dlx yyx-agent-kit myapp -p D:\projects` → 生成后 `cd` 进去 `pnpm install && opencode` |
| 仓库内开发时建项目 | `pwsh -NoProfile -File F:\project\yyx-agent-kit\scripts\new.ps1 -Name myapp -Path D:\projects`（skills 用本机绝对路径，不复制） |
| 改了 agent 想让全局生效 | 跟助手说「同步全局」→ 跑 `sync.ps1` → `/reload`（首次新建 agents 目录需 `opencode service restart`） |
| 发布新版本 CLI | `npm login` → `npm pack --dry-run` → `npm publish`；包内容由 `package.json` 的 `files` 控制（`cli/`、`templates/`、`agents/`、`skills/`） |
| 查某个坑/约定 | `docs/guides/pitfalls.md`（踩坑）、`docs/guides/conventions.md`（工作约定）、`docs/reference/scaffolds/`（官方脚手架基线） |

## 7. 现有交付物走到哪了

`docs/deliverables/20261124-*` 是历史需求，按文件判断进度：

| slug | 已有文件 | 实际进度 |
| --- | --- | --- |
| `20261124-admin-mantine` | 01 / 02 / 03 / 04-test-plan / 04-test-report / 04-visual-check | 阶段 4 完成（报告「通过」），**未归档** |
| `20261124-admin-router` | 01 / 02 / 03 | 阶段 3 完成，未进阶段 4 |
| `20261124-db-migration` | 01 / 02 / 03 | 阶段 3 完成，未进阶段 4 |
| `20261124-mantine-ui-mcp` | 02 / 03（方案里合并写了需求+验收） | 阶段 1+2 合并后做到阶段 3，未测试 |
| `20261124-prisma7-upgrade` | 02 / 03（同上） | 阶段 1+2 合并后做到阶段 3，未测试 |

> 这些历史目录里**没有** `01-wireframe.md` / `01-interaction.md` / `05-record.md`，需求索引条目也没建——三件套和强制自检是后加的规则（见 CHANGELOG Unreleased）。

## 8. 全局 MCP 配置（当前）

`C:\Users\Administrator\.config\opencode\opencode.json` 配了 3 个 server：

| server | 类型 | 用途 |
| --- | --- | --- |
| `browse` | local | 浏览器自动化（`browse.exe mcp`） |
| `ardot` | remote | 矢量设计画布（`http://127.0.0.1:50501/api/v1/mcp`） |
| `open-design` | local | HTML 源码式设计工作台（本地 daemon） |

全局没有配 `skills` 数组和 `default_agent`——流水线只在项目级启用 chief。

## 9. 现状里值得注意的三处不一致

审查时发现，不是文档错误，是后续需要处理的现状：

1. **CLI 版本号不一致**：`package.json` 是 `0.1.1`，但 `cli/bin/yyx-new.mjs` 里 `VERSION = '0.1.0'`，`--version` 会报旧号。
2. **历史需求缺归档文件**：5 个 slug 都没有 `05-record.md`，需求索引条目也不存在（当时是独立 `docs/INDEX.md`，现已并入 `docs/README.md`），流水线阶段 5 从未真正走完。
3. **三件套规则只对新需求生效**：历史目录里没有线稿和交互稿，不必回头补，但要知道「按老文件判断进度」时它们本来就不该存在。

## 10. 硬规则速查

- 包管理只用 pnpm；端口统一 47xxx + `strictPort`。
- 数据库结构变更**必须 Prisma Migrate，禁止 `prisma:push`**；迁移 SQL 入库即代码，必须 review。
- 新建/引入技术**先用 ego 查官网一手资料 + 官方脚手架**，不靠记忆；下「不可行」结论前要交叉验证一个独立来源。
- 生成物（`*.gen.ts`、`dist/`）禁手改、禁加注释。
- 文件命名按生态惯例、场景内统一；React 组件 PascalCase、Nest 小写连字符+角色后缀。
- 文档、提交信息、回复一律简体中文。
- 每模块/功能目录要有 `index.ts`，只 re-export 不写业务逻辑；外部导入走目录路径。
