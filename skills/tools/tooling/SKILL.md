---
name: 工具链索引
description: 需要调用 ardot 设计工具、opencode CLI 或其它第三方 CLI/MCP 时加载，说明能力边界与探测方法
---

# 工具链索引

原则：**先探测，再调用**。任何 CLI 先用 `--help` 确认子命令与参数，不要凭印象拼命令；MCP 工具先列工具名再调用。探测失败就报告「工具不可用」，不要伪造结果。

## 能力分类

| 需求 | 用什么 | 备注 |
| --- | --- | --- |
| 画界面原型、设计稿、设计规范落地 | ardot（MCP server 名 `ardot`） | 需要文件 URL；工具含创建节点、应用样式、导出 |
| PM 线稿、设计系统、设计稿转代码 | Penpot（官方 MCP，本地免 key） | 见 `tools/penpot/README.md` 与 `skills/tools/penpot/SKILL.md`；作用于当前焦点页，写操作需先确认 |
| 无人值守批量执行、CI 里跑任务 | opencode CLI | `opencode run`、`opencode api`、`opencode mcp` |
| 本地依赖服务（PostgreSQL/Redis/…） | docker compose | 项目自带的 `docker-compose.yml`，项目自包含；见 `workspace` 规范 |
| 浏览器操作（登录后台、验证页面、配第三方 OAuth） | ego-browser | **优先用**；复用用户已登录的浏览器上下文。先 `ego-browser skill` 读指南，`ego-browser nodejs` 跑脚本 |

## ardot

- 走 MCP，不需要命令行。先确认连接状态与可用工具，再按「查文件 → 读节点 → 改样式/建节点 → 校验」的顺序做。
- 文件 URL 形如 `https://ardot.tencent.com/file/<numericFileId>`，可带 `node_id`；`node_id` 里含 `;` 时整体保留，不要拆分。
- 改样式前先读现有样式，保持设计体系统一；批量改完要做一次视觉校验。

## ego-browser（浏览器操作首选）

- 凡是要操作网页（登录管理后台、验证前端页面、查官网文档、配置 Google OAuth 等），**优先用 ego-browser**，不要用其它浏览器工具硬凑。
- **先探测**：`ego-browser --version`。命令不存在或连不上 → 告诉用户"需要安装 ego-browser 才能操作浏览器，请安装后告诉我再继续"，停止，不要伪造结果。
- 用法：`ego-browser skill` 读对应版本指南；`ego-browser nodejs` 跑脚本（PowerShell 写 `.mjs` 文件再 import，别用 `-e` 传多行）。
- 需要用户本人操作（密码、2FA、扫码、验证码）→ `task.handOff()` 交还控制权，不要自己猜或代填。
- 任务结束用 `task.finish({ keep: [] })` 关闭任务空间。

## 新建项目 / 引入技术

- **先用 ego 去官网查**：新建项目、引入框架/工具、升级版本时，用 ego-browser 访问官网/官方文档确认当前最新用法与版本要求，不要凭记忆或过往经验写配置。
- **用官方脚手架**：前端 `create-vite` / `create-next-app`、后端 `nest new` 等，先生成官方当前模板，再改造成 monorepo 规范。技术迭代快，经验常过时（如 TS 7 移除 compiler API 导致 Nest CLI 不可用）。
- 落地到 `templates/base` 后同步更新 skills/agents。

## opencode CLI

```bash
opencode run "按 docs/deliverables/<slug>/02-tech-design.md 实现 T1"   # 单次无头执行
opencode api get /api/info                                # 探活与接口调用
opencode mcp list                                         # 查看 MCP 连接状态
```

- 用在流水线里自动推进阶段时，每个 `opencode run` 只给一个阶段目标，并让它读交付物文件，不要把整条链路写进一句 prompt。
- MCP 需要登录时让用户执行 `/mcps` 手动授权，不要在脚本里尝试自动化登录。

## 通用纪律

- 任何工具失败，最多换一种参数重试一次；仍失败则报告原始错误输出。
- 不把 token、cookie、内部地址写进文档或提交。
- 工具产出的文件（设计稿、导出图）记进 `06-record.md` 的交付物表。
