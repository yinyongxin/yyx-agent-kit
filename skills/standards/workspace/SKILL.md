---
name: 工程规范
description: 通用工程规范：pnpm、mise、monorepo、构建产物、部署脚本、本地 Docker 服务。适用于所有项目
---

# 工程规范

## 包管理与运行时

- **包管理**: pnpm（禁止使用 npm 或 yarn）
- **运行时**: mise 管理（node、bun 等），用 `mise install` / `mise use` / `mise global` 切换版本
- **Node.js 版本**: 项目根目录 `mise.toml` 指定，使用 `mise install` 安装。当前框架最低要求：NestJS 12 需 v22.22.3+/v24.15+（CLI），Next.js 16 需 v20.9+
- **技术栈版本基线**（2026-11-24 官网查询，用 ego 复核，见 `docs/reference/scaffolds/`）: Vite 8.x + React 19.3 + TS 7（前端）、NestJS 12 + TS 6（后端，Nest CLI 限制）、Next.js 16（门户）。**升级时重新用 ego 查官网 + 跑官方脚手架，不靠旧版本经验**
- **TS 版本前后端分开**: 前端 admin/client/portal 用 TS 7（跟 Vite 官方脚手架一致）；后端 server 锁 TS 6（Nest CLI 依赖 compiler API，TS 7 无此 API）
- **升级方法**: 用官方脚手架在临时目录生成最新基础项目（`npm create vite@latest` / `npx @nestjs/cli@latest new` / `pnpm create next-app`），对照其 package.json/tsconfig/lint 配置迁移到本 monorepo，再叠加我们的端口/代理/共享包/Prisma RBAC/Docker 约定

## Monorepo 结构

- **工作区配置**: 根目录 `pnpm-workspace.yaml` 定义 `apps/*` 与 `packages/*`
- **应用**: `apps/client`（客户端）、`apps/admin`（管理端）、`apps/portal`（门户，Next.js）、`apps/server`（后端）
- **选型**: 需要 SEO 的公开站点用 Next.js；登录后的业务应用与后台用 Vite SPA，不要全部迁到 Next
- **共享包**: `packages/shared`（常量/工具/类型）、`packages/api`（接口层）
- **依赖安装**: 在根目录执行 `pnpm install`，自动安装所有子项目依赖
- **锁文件**: 只在根目录有 `pnpm-lock.yaml`，子项目不应有独立锁文件
- **脚本**: 根目录用 `pnpm --filter <包名>` 转发，如 `dev:client`；构建用 `pnpm -r --workspace-concurrency=1 build`

## packages 约定

- 以 TS 源码被 Vite 直接消费，**没有构建产物**，`exports` 直接指向 `./src/index.ts`
- `package.json` 的 `exports` 是白名单：新增子路径必须同时改 `exports`，否则引用方解析不到
- 不引入宿主环境依赖（`react`、`fetch`、`window`），否则小程序 / App 端无法复用
- 共享只到类型、常量和纯逻辑；UI 组件不要跨端共享
- 每个包的 `src/` 都要有 README，说明职责、文件索引、注意事项

## 接口层

- 接口类型、SDK、错误处理**收敛在 `packages/api`**，各端业务代码不自己写 fetch、不自己拼 URL
- **路由段按业务领域命名**（如 `/orders`、`/patients`），`health` 只做运维探活，不承载业务
- **跨端共用的常量放 `packages/shared`**：`API_PREFIX`、`API_ROUTES`、业务枚举、类型。新增接口先加常量，controller 与 api 层都引用它，禁止前后端各写一份字符串
- 服务端是 CommonJS，不能直接 `require` TS 源码包：通过相对路径引用 shared 源码（`../../../packages/shared/src/index`），并在 tsconfig 里把 `rootDir` 提到仓库根、`include` 加上 shared 源码，输出结构随之变成 `dist/apps/server/src/...`
- `baseUrl` 默认 `/api`，开发期由 Vite 代理到后端；**不写死后端域名**
- 手写装配文件（token 注入、401 回调）放在 `src/` 外。接入 OpenAPI 生成后 `src/` 会被整目录重建，放里面会被删
- 401 只负责通知调用方，清会话和跳登录由各端实现，传输层不感知路由
- 生成物（`*.gen.ts`）禁止手改，唯一更新方式是重新生成

## 多端边界

- PC / H5 / 管理端可共享 `packages/shared` 与 `packages/api`
- 小程序 / App 没有标准 `fetch`：通过注入 `fetcher` 适配，不改请求层实现
- 小程序 / App 不共享 Web UI 组件，只共享类型与纯逻辑
- 新增端时新建 `apps/<端名>` 并复用 packages，不复制代码

## pnpm 版本差异（易踩）

- pnpm 10 及以前：`pnpm-workspace.yaml` 用 `onlyBuiltDependencies`（数组）
- pnpm 11：改名为 `allowBuilds`，且是 **map**：

```yaml
allowBuilds:
  esbuild: true
```

写错会一直以 `ERR_PNPM_IGNORED_BUILDS` 退出 1。

## 端口约定

- 统一使用 **47xxx 段**，禁止 `3000` / `5173` / `8080` 等框架默认端口，避免与本机其他项目冲突
- Vite 必须设 `strictPort: true`，端口被占时直接失败，不要静默换端口
- 后端端口允许用 `PORT` 环境变量覆盖（部署环境注入），本地默认值写在代码里
- 前端开发期通过 Vite 代理访问后端，代理目标与后端端口保持一致

## 本地开发启动

- 根目录 `pnpm dev`：`concurrently` 同时启动 server / client / admin / portal / Penpot MCP，server 就绪后自动打开开发导航页 `http://localhost:47100/api/dev`（`scripts/open-dev.mjs`）
- Windows 双击 `start-dev.cmd` / `stop-dev.cmd`：启动 = 检查 Docker + `docker compose up -d` + 等 PG 就绪 + `pnpm dev`；停止 = 结束应用进程 + `docker compose down`（保留数据卷）
- 导航页自动探测各应用与依赖服务（HTTP / TCP / `SELECT 1`），未启动的服务显示启动命令；每 5 秒刷新
- 导航页只由 server 在非生产环境注册（`apps/server/src/dev/`），生产访问返回 404，接口不返回连接串/密码
- 单独启某一端仍用 `pnpm dev:server` / `pnpm dev:admin` 等

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

**项目自带独立环境**：每个项目根目录有 `docker-compose.yml`，自带 PostgreSQL(pgvector) + Redis，认证由 NestJS 官方包实现（状态存 PostgreSQL，无独立 IdP 容器），容器名 / volume / 网络名带项目前缀。**不要依赖全局 `local-dev-docker-container`**，那是跨项目共享的中间件池，仅供临时验证用，不作为项目依赖。

### 项目自包含环境（默认）

```bash
cp .env.example .env            # 改端口和密码，多项目并存时端口必须不同
docker compose up -d            # 起 PostgreSQL(pgvector) + Redis
docker compose ps               # 状态（含 healthcheck）
docker compose logs -f postgres # 日志
docker compose down             # 停止，保留数据
docker compose down -v          # 停止并删数据卷（危险）
```

- 数据库：**PostgreSQL + pgvector**（`pgvector/pgvector:pg17`），初始化 SQL 已 `CREATE EXTENSION vector`，向量检索单库搞定，不另起向量库；访问封装成 `VectorStore` 接口，将来可换 Qdrant。
- **数据库结构变更强制走 Prisma Migrate**（详见 `docs/guides/conventions.md` 第 5 节）：改 `schema.prisma` → `pnpm --filter @starter/server db:migrate -- --name <语义名>` 生成迁移文件 → review SQL 后提交入库 → 生产/CI `db:deploy` 应用。`prisma:push` **仅一次性原型验证**，禁止用于正式开发与生产；`migrate` 管 DDL、`db:seed` 管初始数据，不可混用；已应用迁移禁止手改，修正走新迁移或反向迁移。
- 端口：默认 54732(Postgres) / 46379(Redis)，映射到宿主，**多项目并存时每个项目的 `.env` 用不同端口**。应用端口仍走 47xxx 段。
- 连接：本地进程用 `localhost` + 映射端口（见 `.env` 的 `DATABASE_URL` / `REDIS_URL`）；容器内用 service 名 `postgres` / `redis`。
- 密码只放 `.env`（已 gitignore），不写死在代码或提交里。
- **认证/授权**：NestJS 官方 `@nestjs/authentication` + `@nestjs/authorization`（非外部 IdP）。session/refreshToken/mfa/oidcState/emailToken 存进同一个 PostgreSQL（store 契约，见 nestjs skill）。多平台共用一个 server，天然共享登录态；Google OIDC 开箱即用，微信需自定义 provider。生产必须注册全部 store 并配 HTTPS/CSRF/trustedOrigins，详见 `docs/guides/credentials.md`。

### 跨项目共享中间件池（仅临时验证）

路径 `F:\sh-project\local-dev-docker-container`（https://github.com/yinyongxin/local-dev-docker-container），含 MySQL/Redis/MongoDB/RabbitMQ/Qdrant/Elasticsearch/MinIO 等，**不作为项目运行依赖**，只在需要临时验证某个中间件时用。
