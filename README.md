# skills

个人 OpenCode 配置源仓库，位于 `D:\project\skills`。

`~/.config/opencode` 只做落地目录：skills 由配置直接指向本仓库，agents 由 `scripts/sync.ps1` 同步过去。

## 结构

```text
D:\project\skills\
├── skills/                  # ← opencode.json 的 skills 数组指向这里
│   ├── product-pipeline/    # 五阶段流程与门禁（主流程）
│   ├── prd/                 # PRD 模板
│   ├── tech-design/         # 技术方案模板
│   ├── qa-regression/       # 测试与回归方法
│   ├── archive/             # 归档模板
│   ├── tooling/             # ardot / opencode / ego 等工具索引
│   └── yyx/                 # 个人开发规范（前端/后端）
├── agents/                  # 角色定义 → 同步到 ~/.config/opencode/agents
│   ├── chief.md             # 产品交付总管（primary）
│   ├── product.md           # 产品设计
│   ├── architect.md         # 技术负责人
│   ├── coder.md             # 开发实施
│   ├── qa.md                # 测试与回归
│   └── archivist.md         # 记录归档
└── scripts/sync.ps1         # 一键同步
```

## 接入方式

全局 `~/.config/opencode/opencode.json`：

```jsonc
{
  "skills": ["D:/project/skills/skills"],
  "default_agent": "chief"
}
```

- **skills 不复制**：配置直指仓库目录，`git pull` 后 `/reload` 即生效。
- **agents 复制**：OpenCode 只从 `~/.config/opencode/agents` 读取，必须执行 `sync.ps1`。

## 规则

- Skill 必须是 `<id>/SKILL.md`，skill ID 等于目录名（不是 frontmatter 的 `name`）。
- Agent 放在 `agents/<id>.md`，ID 等于文件名。
- 新增/删除/改名 agent 后要重新跑一次 `sync.ps1`，脚本会按 `.synced.json` 清理残留。

## 首次安装

```powershell
git clone git@github.com:yinyongxin/skills.git D:\project\skills
```

然后在 `~/.config/opencode/opencode.json` 加上 `"skills": ["D:/project/skills/skills"]`，再执行：

```powershell
powershell -ExecutionPolicy Bypass -File D:\project\skills\scripts\sync.ps1
```

## 日常更新

```powershell
powershell -ExecutionPolicy Bypass -File D:\project\skills\scripts\sync.ps1
```

或在 OpenCode 里执行 `/reload`。

## 已知行为

- 新增、修改、删除 `agents/*.md` 后，`/reload` 即可生效。
- 如果 `~/.config/opencode/agents` 目录本身被删除后重建，OpenCode 的目录监听会失效，此后的 `/reload` 扫不到 agent，需要执行一次 `opencode service restart`（会中断当前会话，请在普通终端里执行）。
- `~/.config/opencode/skills` 已不再使用，skills 全部来自 `D:/project/skills/skills`；配置里的 `skills` 数组是唯一来源。

## 使用

- 默认 agent 为 `chief`。接到需求后它会加载 `product-pipeline`，按「产品设计 → 技术方案 → 开发 → 测试回归 → 归档」分派给 `product` / `architect` / `coder` / `qa` / `archivist`。
- 手动指定 skill：`@product-pipeline`、`@prd`、`@qa-regression`。
- 交付物统一写进项目内 `docs/<slug>/`，门禁依据文件状态而非记忆。
