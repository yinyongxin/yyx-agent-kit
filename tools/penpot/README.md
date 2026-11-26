# tools/penpot — 自托管 Penpot 与本地 MCP

## 职责

Penpot 是开源自托管的 UI 设计/原型工具，补上「PM 线稿 → 前端代码」之间的空档。Penpot 服务已合并进 `templates/base/docker-compose.yml`，本地开发时和 PostgreSQL / Redis 一起启动；本目录只保留接入说明，不维护第二份 compose。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `README.md` | 本文件：启动步骤、MCP 模式、限制与约定 |

## 关联

### 启动（与本地依赖一起）

```powershell
cd F:\project\yyx-agent-kit\templates\base
cp .env.example .env
docker compose up -d
# PostgreSQL(54732) + Redis(46379) + Penpot(http://localhost:9001) + Mailpit(8025) 一起起来
```

Penpot 用独立的 PostgreSQL 15 容器（`starter-penpot-postgres`）和 Valkey，不复用业务库；容器名/卷都带 `starter-` 前缀，多项目并存不冲突。端口和密码在 `.env.example` 里配（`PENPOT_PORT` / `PENPOT_MAILPIT_PORT` / `PENPOT_DB_PASSWORD` / `PENPOT_SECRET_KEY`）。compose 已带 `enable-mcp` flag。

### 远程 MCP（当前采用）

自托管实例的远程端点：`http://localhost:9001/mcp/stream?userToken=<MCP_KEY>`。

1. Penpot 账户 → **Integrations → MCP Server** → 启用并生成一次性 key（只显示一次）
2. 把带 `userToken` 的 URL 写进**全局** `~/.config/opencode/opencode.json` 的 `mcp.servers.penpot`，**绝不进仓库**（key 是密码级凭据；泄露后到 Integrations 页 regenerate）
3. 浏览器打开 `http://localhost:9001` 的设计文件 → **File → MCP Server → Connect**（插件连当前文件）
4. 先用只读 prompt 验证：`List pages in this file.`

### 本地 MCP（备用，免 key）

终端跑 `npx -y @penpot/mcp@stable`（manifest `localhost:4400`、MCP `http://localhost:4401/mcp`），插件用 **Plugins → Load from URL → `http://localhost:4400/manifest.json`**。本地模式可用 `import_image` 从本地路径导入图片、导出到指定路径；远程模式不支持这两点。

> pnpm 12 会拦截 esbuild/sharp 的构建脚本，本地模式首次启动需在 npx 缓存包的 `pnpm-workspace.yaml` 把 `allowBuilds` 占位值改成 `true`，再 `pnpm run build && pnpm run start`。

### 两种模式对比

| | 远程（当前） | 本地（备用） |
|---|---|---|
| 认证 | 一次性 key（全局配置，不进仓库） | 免 key，靠浏览器插件会话 |
| 本地文件系统 | 不可用（`import_image` 无；导出不写本地路径） | 可用 |
| 启动 | compose 起 Penpot + 插件连接即可 | 另跑 npx server + 插件 |

### 文件格式

`.penpot` 是 ZIP 容器 + 人类可读 JSON（含 manifest / 页面 / 图形 / 组件 / 设计 token），官方有完整格式规范。agent 可以直接读文件结构，不必只靠 MCP。

### 关键限制（官网明确）

- MCP 作用于**浏览器当前焦点页**；切换焦点页，上下文跟着走
- MCP 插件同一时间只能在一个浏览器标签页激活
- 标签页休眠/冻结会断连，需保持 Penpot 标签活跃（Chrome 可设 "Always keep these sites active"）
- agent 有**写权限**：能创建/重命名/移动/删除/改样式；先用只读验证、描述变更再执行、小步可逆
- 图片理解需要 VLM（视觉语言模型）

## 同步要求

Penpot 服务配置以 `templates/base/docker-compose.yml` 为准，升级按官网小步升 `PENPOT_VERSION`。MCP key 和任何 token 不写进仓库，只放全局配置。接入流程变化时同步 `skills/tools/penpot/SKILL.md` 与本文件。
