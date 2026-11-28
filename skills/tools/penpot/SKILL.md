---
name: Penpot 设计工具
description: 通过 Penpot 官方 MCP 读写当前焦点设计页，做线稿审查、设计 token、组件整理、设计转代码时加载。用户说「看 Penpot 设计」「导出设计稿」「按设计写页面」「整理 Penpot 组件/token」时用这个 skill——不是画图的替代，而是让 agent 读懂并操作已有的 Penpot 文件。
---

# Penpot 设计工具

目标：通过 Penpot 官方 MCP（本地模式，免 key）或 `.penpot` 文件（ZIP+JSON）读写设计，把设计阶段的产出接到前端开发。

## 前置条件（缺一不可）

- Penpot 已启动：仓库级独立服务 `yyx-agent-kit/tools/penpot`（README：`tools/penpot/README.md`），默认 `http://localhost:9001`
  - 启动：`pwsh -NoProfile -File <yyx-agent-kit>/tools/penpot/start.ps1`
  - 其他项目/远程 Penpot：把下面命令里的地址换成实际地址（建议环境变量 `PENPOT_URL`）
- 本机已启动一个 Penpot 本地 MCP（全机一个实例，多个项目共用）：
  - `pwsh -NoProfile -File <yyx-agent-kit>/tools/penpot/start-mcp.ps1`
  - 或 `npx -y @penpot/mcp@2.17.0`
  - 监听 4400（插件 manifest）/4401（MCP）/4402（WS）
- 全局 `opencode.json` 配了 `penpot` 远程 MCP：`http://localhost:4401/mcp`
  - 启动顺序：先 MCP，再 OpenCode；OpenCode 启动后才起 MCP 会一直显示未连接
- Penpot 里加载插件（**Plugins → Load from URL → `http://localhost:4400/manifest.json`**）并 **Connect**（MCP 作用于当前焦点页）

> 远程模式（`http://localhost:9001/mcp/stream?userToken=<KEY>`）已弃用；优先本地 MCP，避免在仓库外维护 key。

## 在非 kit 项目中使用

skill 源文件在 `yyx-agent-kit/skills/tools/penpot/`：

- `yyx-new` 生成的项目会自动复制到 `.opencode/skills/`
- 其他项目可安装到全局 OpenCode skills：

```powershell
pwsh -NoProfile -File <yyx-agent-kit>/tools/penpot/install-skill.ps1
```

安装后重启 OpenCode，所有项目都能加载本 skill。

## 工具能力（官方 MCP）

- `high_level_overview` — 页面/结构概览
- `penpot_api_info` — API 能力说明
- `execute_code` — 在 Penpot 内执行读写脚本（改 token、改组件、重命名图层等）
- `export_shape` — 导出图形（本地模式可写本地路径）
- `import_image` — 从本地路径导入图片（本地模式可用）

## 工作流

1. **先只读验证**：`List pages in this file.` / `Analyze the structure of this design and summarize it.`
2. **再按需求读细节**：列出组件、颜色样式、布局结构、token 用法
3. **写操作前先描述**：把要改什么列出来，等用户确认再执行；小步可逆，不要一次重构整个文件
4. **设计转代码**：提取布局结构 + token → 生成语义化 HTML/CSS → 对照前端组件映射
5. **完成时**：把设计文件路径/导出资源记进交付物记录

## 关键限制

- MCP 只作用于**当前焦点页**，且同一时间只能一个标签页激活；标签页休眠会断连，需保持活跃
- agent 有写权限，能真改设计文件——不确认就执行是高风险
- 本地模式靠活动插件会话，**不需要 MCP key**；MCP 进程要一直开着，断了就重连插件
- 图片理解需 VLM

## 与流水线其他工具的分工

| 工具 | 位置 | 职责 |
| --- | --- | --- |
| Penpot + MCP | 阶段 1/2 与开发之间 | PM 线稿、设计系统、设计稿转代码 |
| ardot | 阶段 1 可选 | agent 脚本化建节点/改样式的矢量画布 |
| OpenDesign | 阶段 3 可选 | 直接产出可运行 HTML 页面 |

详细接入步骤与限制见 `tools/penpot/README.md`。
