# tools/penpot — 自托管 Penpot 与本地 MCP

## 职责

Penpot 是开源自托管的 UI 设计/原型工具，补上「PM 线稿 → 前端代码」之间的空档。Penpot 服务已合并进 `templates/base/docker-compose.yml`，本地开发时和 PostgreSQL / Redis 一起启动；本目录只保留接入说明，不维护第二份 compose。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `README.md` | 本文件：启动步骤、本地 MCP、限制与约定 |

## 启动

```powershell
cd F:\project\yyx-agent-kit\templates\base
cp .env.example .env
docker compose up -d
# PostgreSQL(54732) + Redis(46379) + Penpot(http://localhost:9001) + Mailpit(8025)
```

Penpot 用独立的 PostgreSQL 15 容器（`starter-penpot-postgres`）和 Valkey，不复用业务库；容器名/卷都带 `starter-` 前缀，多项目并存不冲突。端口和密码在 `.env.example` 里配（`PENPOT_PORT` / `PENPOT_MAILPIT_PORT` / `PENPOT_DB_PASSWORD` / `PENPOT_SECRET_KEY`）。

> 模板**只支持本地 MCP 模式**：compose 不再包含 `penpot-mcp` 容器，也没有 `enable-mcp` flag。远程模式（`http://localhost:9001/mcp/stream?userToken=...`）已弃用，避免在仓库外维护 key。

## 本地 MCP（唯一模式，免 key）

```powershell
pnpm penpot:mcp        # = npx -y @penpot/mcp@2.17.0
```

启动后监听：

| 端口 | 用途 |
| --- | --- |
| 4400 | 插件 manifest 与预览页（浏览器加载用） |
| 4401 | MCP HTTP 端点（OpenCode 连接） |
| 4402 | 插件 WebSocket 桥 |
| 4403 | REPL（调试用，可忽略） |

### 接入步骤

1. 先启动 MCP：`pnpm penpot:mcp`（保持这个终端开着）
2. 全局 `~/.config/opencode/opencode.json` 配本地 MCP：

   ```json
   "penpot": {
     "type": "remote",
     "url": "http://localhost:4401/mcp"
   }
   ```

   （`@penpot/mcp` 只提供 HTTP 传输，没有 stdio，所以是 `remote` 而不是 `local`；URL 不含 key，仅本机。）

3. 重启 OpenCode（MCP 在启动时连接；先开 OpenCode 后起 MCP 会一直显示未连接）
4. 浏览器打开 http://localhost:9001 → 登录 → 打开一个设计文件
5. 主菜单 → **Plugins → Load from URL** → `http://localhost:4400/manifest.json` → 授权
6. 插件面板点 **CONNECT MCP SERVER**，状态显示 **Connected** 后，用只读 prompt 验证：`List pages in this file.`

> 插件面板会提示 *Version mismatch detected*（2.17 的服务 vs Penpot 2.18.7）。npm 上没有 2.18.x 版本，这条是版本号比对告警；实测连接、读取、写入均正常。若遇到具体 API 报错，再换 `2.19.1` 试。

### 版本对应

npm 上没有 2.18.x，按 Penpot 版本就近选：

| Penpot | `@penpot/mcp` |
| --- | --- |
| 2.18（当前） | `2.17.0`（模板默认，实测插件与服务可启动） |
| 2.19 | `2.19.1` |
| 2.15 | `2.15.4`（`stable` tag） |

如果加载插件时提示 Plugin API 不兼容，把 `pnpm penpot:mcp` 的版本换成高于 Penpot 的最近版本再试。

### 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| OpenCode 里 penpot 工具列表为空 | MCP 没启动或 URL 不对：先 `pnpm penpot:mcp`，确认 4401 在监听，再重启 OpenCode |
| 插件 Load from URL 失败 | 4400 没起来；浏览器控制台看 CORS/404。MCP 允许跨域（`Access-Control-Allow-Origin: *`） |
| 插件加载后一直转圈 | Penpot 标签页休眠/后台冻结会断 WS；保持标签活跃 |
| `pnpm dlx @penpot/mcp` 报 build script 被拦 | 用 `npx`（npm 会执行构建脚本，实测正常）；确实要用 pnpm 则在缓存包的 `pnpm-workspace.yaml` 的 `allowBuilds` 里放行 esbuild/sharp |
| 端口被占 | 4400–4403 必须是空闲的；Docker 版 `penpot-mcp` 已移除，不会冲突 |

## 文件格式

`.penpot` 是 ZIP 容器 + 人类可读 JSON（含 manifest / 页面 / 图形 / 组件 / design token），官方有完整格式规范。agent 可以直接读文件结构，不必只靠 MCP。

## 关键限制（官网明确）

- MCP 作用于**浏览器当前焦点页**；切换焦点页，上下文跟着走
- MCP 插件同一时间只能在一个浏览器标签页激活
- 标签页休眠/冻结会断连，需保持 Penpot 标签活跃（Chrome 可设 "Always keep these sites active"）
- agent 有**写权限**：能创建/重命名/移动/删除/改样式；先用只读验证、描述变更再执行、小步可逆
- 本地模式可用 `import_image` 从本地路径导入图片、导出到指定路径
- 图片理解需要 VLM（视觉语言模型）

## 同步要求

Penpot 服务配置以 `templates/base/docker-compose.yml` 为准，升级按官网小步升 `PENPOT_VERSION`，并同步 `pnpm penpot:mcp` 的版本。MCP 只在本机 HTTP 端口通信，不写任何 token 进仓库。接入流程变化时同步 `skills/tools/penpot/SKILL.md` 与本文件。
