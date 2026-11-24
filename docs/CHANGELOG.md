# 变更记录

记录仓库与 npm 包 `yyx-agent-kit` 的版本变更。格式参考 Keep a Changelog。

## [0.1.0] - 2026-11-23

首个发布到 npmjs.com 的版本。

### Added

- **CLI `yyx-new`**：Node.js 重写（`cli/bin/yyx-new.mjs`），从 `templates/base` 生成新项目——替换项目名/包名/端口，把 `skills/` 与 `agents/` 内置进 `.opencode/`，项目自包含。`pnpm dlx` / `npx` 均可运行
- **项目级 `.npmrc`**：固定 `registry=https://registry.npmjs.org`，隔离用户级淘宝镜像
- **项目自包含 Docker 环境**：`templates/base/docker-compose.yml`（PostgreSQL + pgvector + Redis）、`docker/init-db.sql`（自动建 vector 扩展）、`.env.example`、`apps/server/Dockerfile`。每个项目独立容器 / volume / 网络，多项目并存不冲突，不依赖全局 local-dev-docker-container
- **门户应用 `apps/portal`**（Next.js App Router）与 `next` 规范 skill
- `docs/` 目录：集中管理踩坑记录与变更记录

### Changed

- **数据库选型定案**：PostgreSQL + pgvector 单库（关系数据 + 向量检索），不另起向量库；向量访问封装成 `VectorStore` 接口，将来可换 Qdrant。`workspace` / `nestjs` 规范同步更新
- **ORM 选型 ADR（Prisma，2026-11-24 补记）**：NestJS 12 官网是 database-agnostic，并列 6 种集成——TypeORM/Drizzle/Mongoose/Sequelize 有 `@nestjs/*` 官方包，MikroORM 由第三方维护，Prisma 无专用包需自行封装 provider。最终选 Prisma，理由：① 多租户隔离用 `$extends({ query: { $allModels } })` 一处拦截全部查询自动注入 `tenantId`（Tenant/Permission/Plan 全局表除外），TypeORM/Drizzle 需自己包装 repository 或写 subscriber；② `schema.prisma` 单一来源定义 Tenant/User/Role/Permission/Plan/Subscription，`generate` 出类型、幂等 seed 建初始数据；③ 官方认证包要求用户模型自定义、状态存自有库，Prisma 便于定义；④ 向量检索用 `$queryRaw` 走 pgvector，不依赖 ORM 向量能力；⑤ 兼容 TS 6 + CommonJS + moduleResolution node。代价：无 Nest 注入包，需自写 `PrismaService`/`PrismaModule`（官网推荐做法）。**后续**：2026-11-24 已按官网升到 7.10.1（`prisma-client` generator + `moduleFormat = "cjs"` + driver adapter + `prisma7.config.ts`），build/lint/typecheck 通过；真实连库与 health 因本机无 Docker 未验证，见 `docs/20261124-prisma7-upgrade/`。当时未走「ego 查官网」硬规则，本条为事后补记。
- **认证/授权定案（ego 深挖官网后修正）**：用 NestJS 官方 `@nestjs/authentication` + `@nestjs/authorization`，**推翻早前的 Authentik 方案**——官方包自带密码/email/2FA/magic link/session/access+refresh token/API key/Google OIDC，状态存自己的 PostgreSQL，用户模型自己定义，oidc.providers 可从租户配置动态加载；授权用 `@Policy()` + `@Can()`。多平台共用一个 server 天然共享登录态，无需外部 IdP。微信需自定义 provider（非标准 OIDC）。逻辑多租户骨架保留：Prisma extension 自动注入 tenantId 过滤
- 数据库选型：PostgreSQL + pgvector 单库（见上）；一个 NestJS server 分 module（auth/knowledge/replay/billing），不拆多服务
- **租户/RBAC 骨架落地**：`apps/server/prisma/schema.prisma`（Tenant/User/Role/Permission/UserRole/RolePermission/OAuthConnection/Plan/Subscription）、幂等 `seed.ts`（默认租户 + admin/member 角色 + 11 权限点 + 2 套餐）、`PrismaService` extension 自动注入 tenantId。认证骨架：官方包 `JwtAuth`(JwtBearerProvider) + `TodoPolicy`(@Can 示例)；health `@Public()` 豁免，todos 需登录授权
- 修正 `apps/server/Dockerfile` 的 CMD 路径（`dist/apps/server/src/main.js`）
- admin 补基础功能页：调 `/api/health` + `/api/todos` 显示后端连通状态与待办列表（ego 验证前后端联通通过）
- server dev 脚本修正：`tsx watch` 无 decorator metadata 导致 DI 失效，改 `nest start --watch` + `nest-cli.json`；`main.ts` 加 findEnv 从 cwd 向上找 .env；`nest-cli.json` 补 `entryFile` 修复入口查找
- 编辑器 moduleResolution 弃用报错：项目统一升 TS 6.0.3 + `ignoreDeprecations: "6.0"`（TS 7 移除 node10 且无 compiler API 不兼容 Nest CLI；TS 5.8 不认 6.0；详见踩坑记录第 14 条）。所有子项目（admin/client/portal/api/shared/server）与根统一 TS 6.0.3
- 新增硬规则：新建项目/引入技术必须用 ego 去官网学习 + 用官方脚手架（`create-vite`/`nest new` 等）生成，不靠经验手写配置
- **全栈大版本升级**（按官网+官方脚手架实测，见 `docs/scaffolds/`）：Vite 6→8.3.6、React 19.3.1、NestJS 11→12、Next.js 15→16.4.6；TS 前后端分开（前端 7 / 后端 6）；Next 16 移除 postcss.config 改用 turbopack + eslint flat config；全量 typecheck/build/lint 通过
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
