# skills

个人 OpenCode 配置源仓库，位于 `D:\project\yyx-agent-kit`。

`~/.config/opencode` 只做落地目录；测试期全局配置已回退，这套东西只在 `D:\project\agent-test` 启用。

## 结构

```text
D:\project\yyx-agent-kit\
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
├── examples\
│   └── agent-test\          可运行样例：客户端/管理端/后端 + packages 共享层
├── scripts\sync.ps1
└── README.md
```

## 样例项目

`examples/agent-test` 是完整可运行的样例，用来验证流水线和工程规范：

- pnpm workspace：`apps/client`、`apps/admin`、`apps/server` + `packages/shared`、`packages/api`
- 端口 47xxx 段，接口统一 `/api` 前缀，路由常量放 `packages/shared`
- 它的 `.opencode/opencode.json` 用相对路径 `../../skills`，**在 `examples/agent-test` 目录打开 OpenCode** 即可，换机器 clone 后不用改路径

```powershell
cd D:\project\yyx-agent-kit\examples\agent-test
pnpm install
pnpm build
opencode
```

Skill ID 取叶子目录名，与分组无关：`skills/flows/prd/SKILL.md` 的 ID 仍是 `prd`。

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

测试项目 `D:\project\agent-test\.opencode\opencode.json`：

```jsonc
{
  "skills": ["D:/project/yyx-agent-kit/skills"],
  "default_agent": "chief"
}
```

## 规则

- Skill 必须是 `<id>/SKILL.md`，ID 等于目录名（不是 frontmatter 的 `name`）。
- Agent 放在 `agents/<id>.md`，ID 等于文件名。
- 新增/删除/改名 agent 后重新跑 `sync.ps1`，脚本按 `.synced.json` 清理残留。

## 同步

```powershell
# 同步到测试项目
powershell -ExecutionPolicy Bypass -File D:\project\yyx-agent-kit\scripts\sync.ps1 -ConfigDir D:\project\agent-test\.opencode

# 同步到全局（全面启用时才用）
powershell -ExecutionPolicy Bypass -File D:\project\yyx-agent-kit\scripts\sync.ps1
```

skills 不复制，配置直指仓库目录；`git pull` 后 `/reload` 即生效。

## 已知行为

- 如果 `~/.config/opencode/agents` 目录本身被删除后重建，`/reload` 扫不到 agent，需要执行一次 `opencode service restart`。
- 全局 `~/.config/opencode/skills/standards` 是指向 `skills/standards` 的 junction，只暴露规范类 skill（`workspace` / `nestjs` / `react`），流程与工具类不进全局。

## 新增技术栈

在 `skills/standards/` 下新建 `<栈名>/SKILL.md`，frontmatter 的 `description` 必须写清「什么时候用」：

```markdown
---
name: Next.js 规范
description: 开发 Next.js 项目时加载。App Router、服务端组件、数据获取约定
---
```

模型靠 `description` 自动选择，不需要改任何配置。跨技术栈的通用约定放 `workspace`，不要复制到每个栈里。
