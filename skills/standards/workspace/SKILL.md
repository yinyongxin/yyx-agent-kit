---
name: 工程规范
description: 通用工程规范：pnpm、mise、monorepo、构建产物、部署脚本、本地 Docker 服务。适用于所有项目
---

# 工程规范

## 包管理与运行时

- **包管理**: pnpm（禁止使用 npm 或 yarn）
- **运行时**: mise 管理（node、bun 等），用 `mise install` / `mise use` / `mise global` 切换版本
- **Node.js 版本**: 项目根目录 `mise.toml` 指定，使用 `mise install` 安装

## Monorepo 结构

- **工作区配置**: 根目录 `pnpm-workspace.yaml` 定义 `apps/*` 为工作区
- **子项目**: `apps/admin-web`（前端）、`apps/server`（后端）
- **依赖安装**: 在根目录执行 `pnpm install`，自动安装所有子项目依赖
- **锁文件**: 只在根目录有 `pnpm-lock.yaml`，子项目不应有独立锁文件

## 通用编码规范

- 异常处理使用 `try/catch` + `console.error`（`catch { /* 静默忽略 */ }` 仅限第三方 SDK 非关键调用）
- **构建产物**: 使用 `releases/` 目录集中管理，不要散落在子项目中
- **部署脚本**: 使用 `--ignore-workspace` 和 `--no-frozen-lockfile` 参数避免影响根目录依赖

## pnpm Workspace 注意事项

- 子项目中嵌套 pnpm 调用（如 `build:deploy` 脚本中调用 `pnpm build`）会导致命令找不到
- **解决方案**: 在根目录分别执行 build 和 deploy，避免嵌套 pnpm 调用
- 使用 `pnpm --filter <package>` 执行子项目命令，不要在子项目脚本中嵌套 pnpm

## PM2 部署

- 后端服务使用 PM2 部署，配置文件：`apps/server/ecosystem.config.js`
- 环境变量文件 `.env.prod` 与 `app-server` 目录同级
- Docker 部署时通过 `--env-file` 传递环境变量
- 使用 `npx pm2` 或全局安装的 `pm2` 命令（不要使用 `pnpm exec`，会有 approve-builds 限制）

## 本地开发环境（Docker Compose）

**配置文件位置**：`F:\sh-project\local-dev-docker-container`
**GitHub 仓库**：https://github.com/yinyongxin/local-dev-docker-container

### 服务清单

| 服务 | 容器名 | 端口 | 用途 |
| --- | --- | --- | --- |
| MySQL | local-dev-mysql | 3306 | 关系型数据库 |
| Redis | local-dev-redis | 6379 | 缓存和会话 |
| MongoDB | local-dev-mongodb | 27017 | 文档数据库 |
| RabbitMQ | local-dev-rabbitmq | 5672/15672 | 消息队列 |
| Qdrant | local-dev-qdrant | 6333/6334 | 向量数据库 |
| Elasticsearch | local-dev-elasticsearch | 9200/9300 | 全文搜索 |
| MinIO | local-dev-minio | 9000/9001 | 对象存储 |
| MailHog | local-dev-mailhog | 1025/8025 | 邮件测试 |
| Adminer | local-dev-adminer | 8080 | 数据库管理 |
| Portainer | local-dev-portainer | 9090 | Docker 管理 |

### 常用命令

```bash
cd F:\sh-project\local-dev-docker-container && docker-compose up -d   # 启动所有服务
docker-compose down                                                    # 停止所有服务
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"          # 查看状态
docker-compose logs -f mysql                                           # 查看日志
docker exec -it local-dev-mysql bash                                   # 进入容器
```

### 账号密码速查

| 服务 | 账号 | 密码 |
| --- | --- | --- |
| MySQL | devuser | devpwd123 |
| MySQL Root | root | root123456 |
| Redis | - | redis123456 |
| MongoDB | admin | mongo123456 |
| RabbitMQ | admin | rabbit123456 |
| MinIO | minioadmin | minio123456 |
