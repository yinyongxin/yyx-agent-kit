# 变更记录

记录仓库与 npm 包 `yyx-agent-kit` 的版本变更。格式参考 Keep a Changelog。

## [0.1.0] - 2026-11-23

首个发布到 npmjs.com 的版本。

### Added

- **CLI `yyx-new`**：Node.js 重写（`cli/bin/yyx-new.mjs`），从 `templates/base` 生成新项目——替换项目名/包名/端口，把 `skills/` 与 `agents/` 内置进 `.opencode/`，项目自包含。`pnpm dlx` / `npx` 均可运行
- **项目级 `.npmrc`**：固定 `registry=https://registry.npmjs.org`，隔离用户级淘宝镜像
- **门户应用 `apps/portal`**（Next.js App Router）与 `next` 规范 skill
- `docs/` 目录：集中管理踩坑记录与变更记录

### Changed

- 模板目录 `examples/agent-test` → `templates/base`；项目名 `agent-test` → `starter`，包名前缀 `@agent-test/*` → `@starter/*`
- 全局 skill：旧的 `yyx` 移除，改为 `skills/standards` junction（`workspace` / `nestjs` / `next` / `react`）
- 所有 `.ps1` 调用统一为 `pwsh -NoProfile -File`（本机 PowerShell 7）
- `agents/` 收敛为 2 个（`chief` primary + `qa` subagent），skills 按 `flows` / `tools` / `standards` 分组

### Removed

- 旧的 `skills/yyx/`（内容已被 standards 覆盖）
- 遗留的 `product` agent
- OIDC workflow（放弃 Trusted Publishing，原因见 [踩坑记录](pitfalls.md#5-trusted-publishing-走不通npm-只支持-webauthn-安全密钥)）

## 仓库阶段（npm 首发之前）

按里程碑列出，均在 2026-11-23：

- **样例并入仓库**：`examples/agent-test` 加入，skills 改相对路径，支持跨设备 clone
- **流水线重构**：精简为 2 agent，新增 PRD → 技术设计 → 开发 → QA → 归档五阶段与可行性回退门禁
- **规范拆分**：`yyx` 拆为 `workspace` / `nestjs` / `react` 按技术栈的规范 skill
- **工程约定补全**：packages 共享层、接口层收敛、多端边界、pnpm 11 配置差异、端口 47xxx + strictPort
- **同步脚本**：agents 改为复制同步 + `.synced.json` 清理残留；`git pull` 失败时中止

## 链接

- [踩坑记录](pitfalls.md)
