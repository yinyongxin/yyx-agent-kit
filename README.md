# skills

个人 OpenCode 配置源仓库，位于 `F:\project\yyx-agent-kit`。

`~/.config/opencode` 只做落地目录；全局已启用：规范类 skill 通过 `skills/standards` junction 直指本仓库，agents 由 `sync.ps1` 同步。流程/工具类 skill 留在项目级按需引用。全局默认 agent 保持内置，需要走流水线时在项目级配 `chief`。

## 结构

```text
F:\project\yyx-agent-kit\
├── agents\                  # 角色定义 → 同步到项目 .opencode/agents
│   ├── chief.md             # primary：编排、门禁、设计文档
│   └── qa.md                # subagent：独立测试与回归
├── skills\
│   ├── flows\               # 流程
│   │   ├── product-pipeline   五阶段与门禁（主流程）
│   │   ├── prd                PRD 模板
│   │   ├── tech-design        技术方案 + 可行性结论
│   │   ├── qa-regression      测试与回归方法
│   │   └── archive            归档模板
│   ├── tools\               # 工具
│   │   └── tooling           ardot、opencode CLI、docker
│   └── standards\           # 规范（按技术栈拆分，新增栈只需加一个目录）
│       ├── workspace        通用工程规范（pnpm/mise/monorepo/部署/Docker）
│       ├── nestjs           NestJS 后端规范
│       └── react            React 前端规范
├── templates\
│   └── base\                项目模板：客户端/管理端/门户/后端 + packages 共享层
├── scripts\sync.ps1
└── README.md
```

## 项目模板

`templates/base` 是完整可运行的项目模板，也是 CLI 生成新项目的复制源：

- pnpm workspace：`apps/client`、`apps/admin`、`apps/server` + `packages/shared`、`packages/api`
- 端口 47xxx 段，接口统一 `/api` 前缀，路由常量放 `packages/shared`
- 它的 `.opencode/opencode.json` 用相对路径 `../../skills`，**在 `templates/base` 目录打开 OpenCode** 即可，换机器 clone 后不用改路径

```powershell
cd F:\project\yyx-agent-kit\templates\base
pnpm install
pnpm build
opencode
```

Skill ID 取叶子目录名，与分组无关：`skills/flows/prd/SKILL.md` 的 ID 仍是 `prd`。

## 创建新项目

CLI 已发布为 npm 包 `yyx-agent-kit`，提供 `yyx-new` 命令，无需 clone 本仓库：

```powershell
pnpm dlx yyx-agent-kit myapp -p D:\projects
```

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| `<项目名>` | 小写字母/数字/`-`/`_`，同时作为 npm scope | 必填 |
| `-p, --path <目录>` | 生成到哪个目录 | 当前目录 |
| `--port-base <数字>` | 端口基址，client/admin/portal/server 依次为 +73/+74/+75/+00 | 47100 |
| `-f, --force` | 目标目录已存在时覆盖 | 关闭 |

生成过程：复制 `templates/base` → 替换项目名/端口 → 把 `skills/` 与 `agents/` 复制进 `.opencode/`。项目自包含，不依赖 CLI 的安装位置，`pnpm dlx` 临时安装也能用。

```powershell
cd D:\projects\myapp
pnpm install
opencode
```

仓库内开发时也可用 PowerShell 版（区别：它写入本机仓库 `skills` 绝对路径，不复制 skills）：

```powershell
pwsh -NoProfile -File F:\project\yyx-agent-kit\scripts\new.ps1 -Name myapp -Path D:\projects
```

## 发布 CLI

发布到 npmjs.com，包名 `yyx-agent-kit`：

```powershell
npm login
npm pack --dry-run    # 预览包内容
npm publish
```

包内容由根 `package.json` 的 `files` 控制：`cli/`、`templates/`、`agents/`、`skills/`。升级时改 `version` 字段再 `npm publish` 即可。

## 为什么只有两个 agent

| 角色 | 容器 | 理由 |
| --- | --- | --- |
| 总管 | `chief` primary | 唯一的默认入口，负责门禁 |
| 测试 | `qa` subagent | 判定者必须独立于实现者，且禁止改业务代码 |
| 产品 / 技术 | `prd` + `tech-design` skill | 两者要来回修订同一份文档，需要上下文连续 |
| 开发 | 内置 `general` subagent | 上下文重，但不需要专属权限或模型 |
| 归档 | `archive` skill | 纯文档，无隔离需求 |

原则：**需要拒绝工具调用、或需要不知道前面推理过程的角色才建 agent，其余用 skill。**

## 接入方式

模板项目 `templates/base/.opencode/opencode.json`：

```jsonc
{
  "skills": ["../../skills"],
  "default_agent": "chief"
}
```

## 规则

- Skill 必须是 `<id>/SKILL.md`，ID 等于目录名（不是 frontmatter 的 `name`）。
- Agent 放在 `agents/<id>.md`，ID 等于文件名。
- 新增/删除/改名 agent 后重新跑 `sync.ps1`，脚本按 `.synced.json` 清理残留。

## 同步

仓库是全局配置的唯一源头：规范类 skill 通过 junction 直指 `skills/standards`，改完 `/reload` 即生效；agents 需要跑脚本同步到 `~/.config/opencode/agents`。

在仓库改完后，跟 OpenCode 说「同步全局」，由它执行下面的命令并提示重启：

```powershell
# 同步 agents 到全局（默认）；脚本会先 git pull --ff-only
pwsh -NoProfile -File F:\project\yyx-agent-kit\scripts\sync.ps1

# 同步到某个项目（如模板项目）
pwsh -NoProfile -File F:\project\yyx-agent-kit\scripts\sync.ps1 -ConfigDir templates\base\.opencode
```

注意：全局 `agents/` 目录首次新建后需要 `opencode service restart` 一次，之后增删改文件用 `/reload` 即可。

## 已知行为

- 如果 `~/.config/opencode/agents` 目录本身被删除后重建，`/reload` 扫不到 agent，需要执行一次 `opencode service restart`。
- 全局 `~/.config/opencode/skills/standards` 是指向 `skills/standards` 的 junction，只暴露规范类 skill（`workspace` / `nestjs` / `next` / `react`），流程与工具类不进全局。

## 新增技术栈

在 `skills/standards/` 下新建 `<栈名>/SKILL.md`，frontmatter 的 `description` 必须写清「什么时候用」：

```markdown
---
name: Next.js 规范
description: 开发 Next.js 项目时加载。App Router、服务端组件、数据获取约定
---
```

模型靠 `description` 自动选择，不需要改任何配置。跨技术栈的通用约定放 `workspace`，不要复制到每个栈里。

## 文档

- [踩坑记录](docs/pitfalls.md) —— npm 发布、代理、编码等环境问题的现象与解法
- [变更记录](docs/CHANGELOG.md) —— 版本与功能变更
