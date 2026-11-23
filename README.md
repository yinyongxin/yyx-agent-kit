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
│   └── standards\           # 规范
│       └── yyx              个人开发规范（前端/后端）
├── scripts\sync.ps1
└── README.md
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
- 全局 `~/.config/opencode/skills/yyx` 是指向 `skills/standards/yyx` 的 junction，只暴露 `yyx` 一个 skill，其他模板不进全局。
