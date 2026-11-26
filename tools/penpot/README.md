# tools/penpot — 自托管 Penpot 与本地 MCP

## 职责

Penpot 是开源自托管的 UI 设计/原型工具，补上「PM 线稿 → 前端代码」之间的空档。本目录放官方 Docker Compose 原样文件，并约定本地免 key 的 MCP 接入方式，让 agent 能读写当前焦点设计页。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `docker-compose.yaml` | 从 Penpot 官方仓库原样下载（https://github.com/penpot/penpot/docker/images/docker-compose.yaml），含前端/后端/PostgreSQL/Valkey/MCP/exporter/admin-console |
| `README.md` | 本文件：启动步骤、两种 MCP 模式、限制与约定 |

## 关联

### 启动（自托管）

```powershell
cd F:\project\yyx-agent-kit\tools\penpot
docker compose -p penpot -f docker-compose.yaml up -d
# Penpot 打开在 http://localhost:9001
```

官方 compose 已带 `enable-mcp` flag（`PENPOT_FLAGS` 里），不用改。要锁版本可设 `PENPOT_VERSION` 环境变量。

### 本地 MCP（免 key，推荐）

1. 终端跑 `npx -y @penpot/mcp@stable` 并保持运行（Node 22，manifest 在 `localhost:4400`，MCP 端点 `http://localhost:4401/mcp`）
2. 浏览器打开 `http://localhost:9001` 的设计文件
3. **Plugins → Load from URL** → `http://localhost:4400/manifest.json` → 运行插件 → **Connect to MCP server**
4. MCP client（OpenCode）连 `http://localhost:4401/mcp`——配置在全局 `~/.config/opencode/opencode.json`，**不进仓库**
5. 先用只读 prompt 验证：`List pages in this file.`

### 远程 MCP（需要 key，本系统不用）

账户 → Integrations → MCP Server → 启用并生成一次性 key → URL `https://<domain>/mcp/stream?userToken=<KEY>`。key 只显示一次、不能写进仓库文档或提交。自托管的 MCP 容器走这条路径，但与本地模式二选一即可。

### 文件格式

`.penpot` 是 ZIP 容器 + 人类可读 JSON（含 manifest / 页面 / 图形 / 组件 / 设计 token），官方有完整格式规范。agent 可以直接读文件结构，不必只靠 MCP。

### 关键限制（官网明确）

- MCP 作用于**浏览器当前焦点页**；切换焦点页，上下文跟着走
- MCP 插件同一时间只能在一个浏览器标签页激活
- 标签页休眠/冻结会断连，需保持 Penpot 标签活跃（Chrome 可设 "Always keep these sites active"）
- agent 有**写权限**：能创建/重命名/移动/删除/改样式；先用只读验证、描述变更再执行、小步可逆
- 图片理解需要 VLM（视觉语言模型）

## 同步要求

官方 compose 原样保留，不手改；升级按官网 docker compose pull（`PENPOT_VERSION` 小步升级）。MCP key 和任何 token 不写进仓库，只放全局配置。接入流程变化时同步 `skills/tools/penpot/SKILL.md` 与本文件。
