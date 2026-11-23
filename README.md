# skills

个人 OpenCode 配置源仓库。**克隆到 `~/.config/opencode/skills` 后，仓库内容就是本机 OpenCode 的唯一真相源。**

## 结构

```text
skills/
├── agents/                  # 角色定义 → junction 到 ~/.config/opencode/agents
│   ├── chief.md             # 产品交付总管（primary）
│   ├── product.md           # 产品设计
│   ├── architect.md         # 技术负责人
│   ├── coder.md             # 开发实施
│   ├── qa.md                # 测试与回归
│   └── archivist.md         # 记录归档
├── product-pipeline/SKILL.md  # 五阶段流程与门禁（主流程）
├── prd/SKILL.md               # PRD 模板
├── tech-design/SKILL.md       # 技术方案模板
├── qa-regression/SKILL.md     # 测试与回归方法
├── archive/SKILL.md           # 归档模板
├── tooling/SKILL.md           # ardot / opencode / ego 等工具索引
├── yyx/                       # 个人开发规范（前端/后端）
└── scripts/sync.ps1           # 一键同步
```

## 规则

- **Skill**：必须是 `<id>/SKILL.md` 形式，skill ID 等于目录名（不是 frontmatter 的 `name`）。
- **Agent**：放在 `agents/<id>.md`，通过 junction 被 OpenCode 读取，pull 后即为最新。
- 仓库根目录的 `*.md` 会被当成 skill 注册（无 `description` 则不会展示给模型），除本 README 外不要在根目录加 md。

## 首次安装

```powershell
git clone git@github.com:yinyongxin/skills.git "$env:USERPROFILE\.config\opencode\skills"
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.config\opencode\skills\scripts\sync.ps1"
```

## 日常更新

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.config\opencode\skills\scripts\sync.ps1"
```

或在 OpenCode 里执行 `/reload`。

## 使用

- 默认 agent 设为 `chief`。接到需求后它会加载 `product-pipeline`，按「产品设计 → 技术方案 → 开发 → 测试回归 → 归档」分派给 `product` / `architect` / `coder` / `qa` / `archivist`。
- 手动指定 skill：`@product-pipeline`、`@prd`、`@qa-regression`。
- 交付物统一写进项目内 `docs/<slug>/`，门禁依据文件状态而非记忆。
