# tools/penpot — 独立 Penpot 服务与 MCP

## 职责

Penpot 是开源自托管的 UI 设计/原型工具，用于「PM 线稿 → 设计稿 → 前端代码」。

**本目录是仓库级独立服务**：不依赖 `templates/base`，一次启动可被本机多个项目共用。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `docker-compose.yml` | Penpot 全套服务（frontend/backend/exporter/admin/postgres/valkey/mailpit） |
| `.env.example` | 端口、版本、密钥、数据库密码 |
| `start.ps1` | 启动 Penpot，等待 9001 可用 |
| `stop.ps1` | 停止 Penpot，保留数据卷 |
| `start-mcp.ps1` | 启动本地 Penpot MCP（全机一个实例） |
| `install-skill.ps1` | 把 `skills/tools/penpot` 安装到全局 OpenCode skills |
| `README.md` | 本文件 |

## 启动

```powershell
pwsh -NoProfile -File F:\project\yyx-agent-kit\tools\penpot\start.ps1
```

默认地址：

| 服务 | 地址 |
| --- | --- |
| Penpot | http://localhost:9001 |
| Mailpit | http://localhost:8025 |

首次启动会复制 `.env.example` 为 `.env`。生产/共享环境请修改：

```text
PENPOT_SECRET_KEY
PENPOT_DB_PASSWORD
```

## 停止 / 数据

```powershell
pwsh -NoProfile -File F:\project\yyx-agent-kit\tools\penpot\stop.ps1
```

- 停止保留数据卷
- `docker compose down -v` 才会删除数据（危险）
- 数据卷沿用历史名称 `starter-penpot-postgres-data` / `starter-penpot-assets`，从模板 compose 迁移不会丢失设计文件

### 从旧模板栈迁移

如果旧容器 `starter-penpot-*` 还在运行，会占用 9001。先停止旧容器（保留卷）：

```powershell
docker stop starter-penpot-frontend starter-penpot-backend starter-penpot-admin-console starter-penpot-exporter starter-penpot-postgres starter-penpot-valkey starter-penpot-mailpit
```

然后用 `start.ps1` 启动新栈 `yyx-penpot-*`。

## 本地 MCP（全机一个实例）

```powershell
pwsh -NoProfile -File F:\project\yyx-agent-kit\tools\penpot\start-mcp.ps1
# 等价于 npx -y @penpot/mcp@2.17.0
```

| 端口 | 用途 |
| --- | --- |
| 4400 | 插件 manifest / 预览页 |
| 4401 | MCP HTTP 端点（OpenCode 连接） |
| 4402 | 插件 WebSocket |
| 4403 | REPL（调试用） |

全局 `~/.config/opencode/opencode.json`：

```json
"penpot": {
  "type": "remote",
  "url": "http://localhost:4401/mcp"
}
```

接入步骤：

1. 启动 Penpot 与 MCP
2. 重启 OpenCode
3. 浏览器打开 http://localhost:9001，登录并打开设计文件
4. 主菜单 **Plugins → Load from URL → http://localhost:4400/manifest.json**
5. 插件面板 **CONNECT MCP SERVER**

## Skill 复用

skill 源文件在 `skills/tools/penpot/SKILL.md`，由 `yyx-new` 自动复制到生成项目的 `.opencode/skills/`。

其他项目（非 kit 生成）可安装到全局：

```powershell
pwsh -NoProfile -File F:\project\yyx-agent-kit\tools\penpot\install-skill.ps1
```

安装后重启 OpenCode，所有项目都可以加载 `penpot` skill。

## 版本对应

| Penpot | `@penpot/mcp` |
| --- | --- |
| 2.18（当前） | `2.17.0` |
| 2.19 | `2.19.1` |
| 2.15 | `2.15.4` |

## 关键限制

- MCP 只作用于浏览器当前焦点页，同一时间只能一个标签页激活
- 标签页休眠/冻结会断开插件 WebSocket
- agent 有写权限：先只读验证，描述变更，用户确认后再执行
- 图片理解需要 VLM

## 同步要求

- 升级 Penpot：修改 `.env` 的 `PENPOT_VERSION`，同步 `start-mcp.ps1` 的 MCP 版本与本文版本表
- 修改端口/启动方式：同步 `skills/tools/penpot/SKILL.md`、`docs/guides/credentials.md`、模板 dev 导航页
- 不把任何 MCP key / token 写入仓库
