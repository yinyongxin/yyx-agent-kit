# 变更记录

记录仓库与 npm 包 `yyx-agent-kit` 的版本变更。格式参考 Keep a Changelog。

## [Unreleased]

- **修复 Nest 12 路由警告**：模板 `app.module.ts` 的 `forRoutes("*")` 改为 `forRoutes("{*splat}")`（命名通配，官网 Middleware → Route wildcards），消除 `LegacyRouteConverter` 警告；重启后 health 探活返回 ok；踩坑 #25 与 nestjs skill 同步
- **配置文件注释规范**：`conventions.md` 新增第 10 节——严格 JSON（尤其 package.json）不支持注释，硬规则写进约定/skill/agent、命令说明写进 README 表格、复杂逻辑抽到 `.ps1`/`.mjs` 并在头部注释，`"//"` 伪注释不作为规范，支持 JSONC 的配置可直接写注释
- **目录导航优先落地**：`conventions.md` 新增第 9 节——目录 README 固定四段（职责/文件索引/关联/同步要求），agent 进目录先读 README 筛选文件再读具体内容，结论以具体文件为准；同步进 chief/qa agent（全局+模板副本）、`product-pipeline` 执行模板、`qa-regression` 回归核对、模板 `AGENTS.md` 与 docs 文档地图
- **阶段性审查修复**：chief agent 不再引用不存在的 `vue`/`solidjs` skill（全局+模板副本）；`prd` skill 补齐 `01-wireframe.md` / `01-interaction.md` 固定结构模板；补齐 `docs/guides`/`reference`/`deliverables` 三个目录的 README.md；修模板内生成项目不存在的路径引用；根 README 结构树与标题更新；模板技术版本改为 Vite 8 + NestJS 12；踩坑 #14/#15 补当前基线说明；`ardot-remote` 更正为 `ardot`；OpenDesign MCP 连接失败时增加降级路径；qa/qa-regression 交付物路径补全；CLI 版本号改为从 package.json 读取
- **文档说明统一为 README.md**：独立的需求索引表并入 `docs/README.md`「需求索引」一节并删除原文件；archive / product-pipeline skill（含 evals）、agent-system 说明、根 README 同步改为指向 README.md 的锚点。全仓库目录说明只用 `README.md` 一种命名
- **需求交付物收敛到 `docs/deliverables/`**：5 个 `20261124-*` 目录统一移入；流水线约定同步改为 `docs/deliverables/<slug>/`，涉及 5 个 flows skill（含 evals）、chief/qa agent（含模板副本）、tooling skill、模板 AGENTS/README、docs 地图与索引、CHANGELOG 历史引用等 25 个文件，路径变体 `<slug>/`、`20261124-` 全部覆盖
- **docs 目录重构**：按用途分成四类——文档地图 `docs/README.md`、当时单独建的需求索引（下一次提交已并入 README）、常设文档 `docs/guides/`（agent-system / conventions / pitfalls / credentials）、参考资料 `docs/reference/scaffolds/`；需求交付物当时仍在根目录。17 个文件的交叉引用同步更新
- **新增 Agent 系统与 Skills 说明文档**：`docs/guides/agent-system.md` 用一张流程图 + 分工表讲清角色、五阶段门禁、10 个 skill、文件流转、agents/skills/模板三套同步机制、常用场景与现有交付物进度，并标出 CLI 版本号不一致等 3 处现状；README 文档入口置顶
- **PM 阶段三件套与强制自检**：阶段 1 交付物从单份 `01-prd.md` 扩为 `01-prd.md` + `01-wireframe.md`（页面显示什么）+ `01-interaction.md`（页面联动/状态流转），用 Markdown + Mermaid、不做精细视觉；`prd` skill 新增「产出后交叉自检」7 条（编号闭环、页面闭环、状态唯一、状态机闭合、Mermaid 可渲染、中文一致、规则有落点），流水线门禁与 chief agent（全局+模板副本）同步，模板 README 目录树同步
- **Prisma schema 多文件拆分**：主文件 `prisma/schema.prisma` 只放 generator/datasource/enum，模型按领域拆到 `prisma/models/{tenant,user,rbac,billing}.prisma`；`prisma.config.ts` 的 `schema` 改指向目录 `"prisma"`（指向文件会静默丢模型，见踩坑记录 #21）。PoC 验证 + `migrate status` 确认无新迁移，typecheck/build 通过
- **文件命名规范**：确定"按生态惯例、场景内统一"原则（`docs/guides/conventions.md` 第 7 节），chief agent 派活时提醒；后端边角文件对齐：`user.ts` → `user.types.ts`、`tenant-context.ts` → `tenant-context.util.ts`，同步所有 import
- **admin 目录结构重组**：routes/（文件路由声明，access/* → URL `/access/*`）与 features/（home/dashboard/access/settings 按领域）分离；两套 header/navbar 布局保留；导航链接同步新 URL；ego 验证新路由可用（踩坑 #22：改路由先 build 生成 routeTree 再 typecheck）
- **admin 组件/页面文件夹化 + 壳内容分离**：所有组件和页面改为目录 + `index.tsx` barrel（只 re-export），可带 css/types/enums/functions；页面统一 `<PageShell>` 外壳 + `XxxContent` 可复用内容（Home/Dashboard 的真实逻辑也拆到 Content）；`PlaceholderPage` 拆成 `PageShell` + `PlaceholderContent`；ego 验证三个页面正常
- **侧栏去掉折叠**：AdminLayout 移除展开/收起和移动端抽屉，侧栏固定 260px；删除多余的静态 starter 标题
- **Vite 前端加 `@/*` 别名**：admin/client 双配置（tsconfig paths + Vite resolve.alias），跨目录 import 改用 `@/`；TS 7 移除 baseUrl（踩坑 #23）
- **OpenDesign 接入与踩坑**：全局 MCP 接入 open-design（本地 CLI + OD_* 环境变量 + pool）；其生成流水线多次因余额不足/模型首 token 超时失败，改为直接用 MCP 文件工具（`create_artifact`/`write_file`）完成介绍页设计；工作规则写入 conventions 1.4，踩坑 #24；直接写前必须先读 `od://design-systems` 与 `od://skills` 资源，按 OpenCode 官方规范重做介绍页
- **数据库变更强制走 migrate 写入 agent 规则**：chief/qa 的 prompt 与 workspace/nestjs skill 明确禁止 `prisma:push` 用于正式开发/生产，schema 变更必须生成迁移文件；新增踩坑 #20（P3005 baseline）

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
- **ORM 选型 ADR（Prisma，2026-11-24 补记）**：NestJS 12 官网是 database-agnostic，并列 6 种集成——TypeORM/Drizzle/Mongoose/Sequelize 有 `@nestjs/*` 官方包，MikroORM 由第三方维护，Prisma 无专用包需自行封装 provider。最终选 Prisma，理由：① 多租户隔离用 `$extends({ query: { $allModels } })` 一处拦截全部查询自动注入 `tenantId`（Tenant/Permission/Plan 全局表除外），TypeORM/Drizzle 需自己包装 repository 或写 subscriber；② `schema.prisma` 单一来源定义 Tenant/User/Role/Permission/Plan/Subscription，`generate` 出类型、幂等 seed 建初始数据；③ 官方认证包要求用户模型自定义、状态存自有库，Prisma 便于定义；④ 向量检索用 `$queryRaw` 走 pgvector，不依赖 ORM 向量能力；⑤ 兼容 TS 6 + CommonJS + moduleResolution node。代价：无 Nest 注入包，需自写 `PrismaService`/`PrismaModule`（官网推荐做法）。**后续**：2026-11-24 已按官网升到 7.10.1（`prisma-client` generator + `moduleFormat = "cjs"` + driver adapter + `prisma7.config.ts`），build/lint/typecheck 通过；真实连库与 health 因本机无 Docker 未验证，见 `docs/deliverables/20261124-prisma7-upgrade/`。当时未走「ego 查官网」硬规则，本条为事后补记。
- **认证/授权定案（ego 深挖官网后修正）**：用 NestJS 官方 `@nestjs/authentication` + `@nestjs/authorization`，**推翻早前的 Authentik 方案**——官方包自带密码/email/2FA/magic link/session/access+refresh token/API key/Google OIDC，状态存自己的 PostgreSQL，用户模型自己定义，oidc.providers 可从租户配置动态加载；授权用 `@Policy()` + `@Can()`。多平台共用一个 server 天然共享登录态，无需外部 IdP。微信需自定义 provider（非标准 OIDC）。逻辑多租户骨架保留：Prisma extension 自动注入 tenantId 过滤
- 数据库选型：PostgreSQL + pgvector 单库（见上）；一个 NestJS server 分 module（auth/knowledge/replay/billing），不拆多服务
- **租户/RBAC 骨架落地**：`apps/server/prisma/schema.prisma`（Tenant/User/Role/Permission/UserRole/RolePermission/OAuthConnection/Plan/Subscription）、幂等 `seed.ts`（默认租户 + admin/member 角色 + 11 权限点 + 2 套餐）、`PrismaService` extension 自动注入 tenantId。认证骨架：官方包 `JwtAuth`(JwtBearerProvider) + `TodoPolicy`(@Can 示例)；health `@Public()` 豁免，todos 需登录授权
- 修正 `apps/server/Dockerfile` 的 CMD 路径（`dist/apps/server/src/main.js`）
- admin 补基础功能页：调 `/api/health` + `/api/todos` 显示后端连通状态与待办列表（ego 验证前后端联通通过）
- server dev 脚本修正：`tsx watch` 无 decorator metadata 导致 DI 失效，改 `nest start --watch` + `nest-cli.json`；`main.ts` 加 findEnv 从 cwd 向上找 .env；`nest-cli.json` 补 `entryFile` 修复入口查找
- 编辑器 moduleResolution 弃用报错：项目统一升 TS 6.0.3 + `ignoreDeprecations: "6.0"`（TS 7 移除 node10 且无 compiler API 不兼容 Nest CLI；TS 5.8 不认 6.0；详见踩坑记录第 14 条）。所有子项目（admin/client/portal/api/shared/server）与根统一 TS 6.0.3
- 新增硬规则：新建项目/引入技术必须用 ego 去官网学习 + 用官方脚手架（`create-vite`/`nest new` 等）生成，不靠经验手写配置
- **全栈大版本升级**（按官网+官方脚手架实测，见 `docs/reference/scaffolds/`）：Vite 6→8.3.6、React 19.3.1、NestJS 11→12、Next.js 15→16.4.6；TS 前后端分开（前端 7 / 后端 6）；Next 16 移除 postcss.config 改用 turbopack + eslint flat config；全量 typecheck/build/lint 通过
- 模板目录 `examples/agent-test` → `templates/base`；项目名 `agent-test` → `starter`，包名前缀 `@agent-test/*` → `@starter/*`
- 全局 skill：旧的 `yyx` 移除，改为 `skills/standards` junction（`workspace` / `nestjs` / `next` / `react`）
- 所有 `.ps1` 调用统一为 `pwsh -NoProfile -File`（本机 PowerShell 7）
- `agents/` 收敛为 2 个（`chief` primary + `qa` subagent），skills 按 `flows` / `tools` / `standards` 分组
- **数据库迁移规范**：权限系统表结构变更从 `db push` 切到 Prisma Migrate（`db:migrate` 生成迁移文件入库 review、`db:deploy` 幂等部署、生产禁止 `db push`）；seed 收窄为只写初始数据；新增初始迁移 `init_permissions`。规范见 `docs/guides/conventions.md` 第 5 节
- **管理端 UI 选型**：`apps/admin` 引入 Mantine 9（仅管理端），交互组件用 Mantine、布局微调用 Tailwind，用 `tailwind-preset-mantine` 对齐主题；client / portal 仍只用 Tailwind。规则见 `docs/guides/conventions.md` 第 6 节
- **管理端路由与菜单布局**：admin 引入 `@tanstack/react-router`（file-based），Vite 插件自动生成 `routeTree.gen.ts`（不手改）；7 个路由页（首页/工作台/用户/角色/租户/权限/设置），Mantine AppShell 可折叠侧边菜单，菜单项集中配置在 `AdminMenu.tsx`
- **复用官方预制布局 + LLM 支持**：管理端菜单改用 ui.mantine.dev 官方 `NavbarNested`/`LinksGroup`（CSS Module + `@tabler/icons-react` + `postcss-preset-mantine`），替掉手写菜单；模板 `.opencode/opencode.json` 接入 `mantine` MCP server，规范写明用 MCP / llms.txt 查最新官方用法

### Removed

- 旧的 `skills/yyx/`（内容已被 standards 覆盖）
- 遗留的 `product` agent
- OIDC workflow（放弃 Trusted Publishing，原因见 [踩坑记录](guides/pitfalls.md#5-trusted-publishing-走不通npm-只支持-webauthn-安全密钥)）

## 仓库阶段（npm 首发之前）

按里程碑列出，均在 2026-11-23：

- **样例并入仓库**：`examples/agent-test` 加入，skills 改相对路径，支持跨设备 clone
- **流水线重构**：精简为 2 agent，新增 PRD → 技术设计 → 开发 → QA → 归档五阶段与可行性回退门禁
- **规范拆分**：`yyx` 拆为 `workspace` / `nestjs` / `react` 按技术栈的规范 skill
- **工程约定补全**：packages 共享层、接口层收敛、多端边界、pnpm 11 配置差异、端口 47xxx + strictPort
- **同步脚本**：agents 改为复制同步 + `.synced.json` 清理残留；`git pull` 失败时中止

## 链接

- [踩坑记录](guides/pitfalls.md)
