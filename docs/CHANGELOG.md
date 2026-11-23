# 变更记录

记录仓库与 npm 包 `yyx-agent-kit` 的版本变更。格式参考 Keep a Changelog。

## [0.1.0] - 2026-11-23

首个发布到 npmjs.com 的版本。

### Added

- **CLI `yyx-new`**：Node.js 重写（`cli/bin/yyx-new.mjs`），从 `templates/base` 生成新项目——替换项目名/包名/端口，把 `skills/` 与 `agents/` 内置进 `.opencode/`，项目自包含。`pnpm dlx` / `npx` 均可运行
- **项目级 `.npmrc`**：固定 `registry=https://registry.npmjs.org`，隔离用户级淘宝镜像
- **项目自包含 Docker 环境**：`templates/base/docker-compose.yml`（PostgreSQL + pgvector + Redis + Authentik server/worker）、`docker/init-db.sql`（自动建 vector 扩展 + authentik 库/用户）、`.env.example`、`apps/server/Dockerfile`。每个项目独立容器 / volume / 网络，多项目并存不冲突，不依赖全局 local-dev-docker-container
- **门户应用 `apps/portal`**（Next.js App Router）与 `next` 规范 skill
- `docs/` 目录：集中管理踩坑记录与变更记录

### Changed

- **数据库选型定案**：PostgreSQL + pgvector 单库（关系数据 + 向量检索），不另起向量库；向量访问封装成 `VectorStore` 接口，将来可换 Qdrant。`workspace` / `nestjs` 规范同步更新
- **认证/授权定案**：Authentik 做统一 IdP（SSO），各平台 OIDC client；身份源先账号密码 + Google（微信以后加 OAuth source）；账号密码存 Authentik、业务库只存 sub 映射；账号/租户归 Authentik，角色权限归业务库 RBAC（不直接信 token claim）；小程序走补充入口（wx.login → 用户联邦 → 本地 JWT）。逻辑多租户骨架：JWT claim 带 tenantId，Prisma extension 自动注入过滤，单租户阶段用默认租户，升级不改业务代码
- 数据库选型：PostgreSQL + pgvector 单库（见上）；一个 NestJS server 分 module（auth/knowledge/replay/billing），不拆多服务
- **租户/RBAC 骨架落地**（Google 暂不接入）：`apps/server/prisma/schema.prisma`（Tenant/User/Role/Permission/UserRole/RolePermission/OAuthConnection/Plan/Subscription）、幂等 `seed.ts`（默认租户 + admin/member 角色 + 11 权限点 + 2 套餐）、`PrismaService` extension 自动注入 tenantId、`TenantMiddleware`、`JwtStrategy`、`PermissionsGuard` + `@RequirePermissions`。认证骨架默认未激活，现有接口免登录可跑；接入 Authentik 时启用全局守卫
- 修正 `apps/server/Dockerfile` 的 CMD 路径（`dist/apps/server/src/main.js`）
- admin 补基础功能页：调 `/api/health` + `/api/todos` 显示后端连通状态与待办列表（ego 验证前后端联通通过）
- server dev 脚本修正：`tsx watch` 无 decorator metadata 导致 DI 失效，改 `nest start --watch` + `nest-cli.json`；`main.ts` 加 findEnv 从 cwd 向上找 .env；`nest-cli.json` 补 `entryFile` 修复入口查找
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
