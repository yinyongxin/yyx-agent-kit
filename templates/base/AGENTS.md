# starter 工程约定

## 硬性规则

- 包管理只用 pnpm，禁止 npm、yarn。依赖装在根目录，子项目不生成独立锁文件。
- 本地依赖服务用项目自带的 `docker-compose.yml`（PostgreSQL + pgvector + Redis），**不要用全局 local-dev-docker-container**。每个项目一套独立容器、volume、网络，名字带项目前缀，多项目并存不冲突。
- 起环境：`cp .env.example .env` 后 `docker compose up -d`；停止保留数据 `docker compose down`；删数据 `docker compose down -v`（危险）。
- 应用连库：容器内用 service 名（`postgres` / `redis`），本地进程用 `localhost` + `.env` 里映射端口。数据库 URL 放 `.env` 的 `DATABASE_URL` / `REDIS_URL`，不硬编码。
- 向量能力用 PostgreSQL 的 pgvector 扩展（初始化 SQL 已 `CREATE EXTENSION vector`），不另起向量库；访问封装成 `VectorStore` 接口，将来要换 Qdrant 只换实现。
- 端口统一使用 **47xxx 段**，禁止用 `3000` / `5173` / `8080` 等框架默认端口，避免与本机其他项目冲突。Vite 必须开 `strictPort`，端口被占时直接失败而不是静默换端口。
- 接口调用统一走 `@starter/api`，业务代码不自己写 `fetch`、不自己拼 URL。
- **日志与 traceId 统一由 `apps/server/src/logging/` 处理**：所有响应头带 `X-Trace-Id` / `traceparent`，错误体带 `traceId`；新接口不要手动加 traceId，也不要另起 logger。业务打印规范见 [`docs/guides/logging-conventions.md`](docs/guides/logging-conventions.md)，架构/运维见 [`docs/guides/logging-and-tracing.md`](docs/guides/logging-and-tracing.md)。
- **本地凭据**：数据库 / Redis / Penpot / Grafana / 测试账号统一在开发导航页 `http://localhost:47100/starter/starter/api/dev#services` 的「本地凭据」卡片查看（仅开发环境，生产 404）；新增有账号密码的本地服务时同步 `src/dev/dev.service.ts` 的 `credentials`。
- **日志检索**：管理端 `/observability/logs`，后端 `apps/server/src/logs/`（只读 Loki）。本地需 `docker compose --profile observability up -d` 起 Loki（47110）/ Grafana（47111）/ Alloy（47112）；日志写入 `logs/app.log` 供 Alloy 采集。
- **租户接口授权按权限点**：租户内业务接口用 `@RequirePermission(PERMISSIONS.xxx)` 声明所需权限（可传多个，全部满足）；权限来自当前租户角色并集，`owner` / `admin` 视为拥有全部权限（`["*"]`）。不要只靠 `@MinRole` 做业务授权，权限点才对应角色配置。
- **跨租户成员操作**：平台级引导/恢复走 `/tenants/:tenantId/members`（写操作要求 `super`），不要为了让平台管理员通过 `TenantMembershipGuard` 而伪造租户成员关系。
- **管理端前端权限**：按钮 / 操作项显隐用 `<Can permission="user:write">`，租户页面级门禁用 `<PermissionGate>`，平台页面用 `<PlatformAdminGate>`；导航菜单用 `useMenuAccess()`（平台专属标 `platformOnly`，租户菜单标 `permission`）。前端只做展示收口，后端仍必须用 `@RequirePermission` / `PlatformAdminGuard` 拦截。
- **审计日志**：关键写操作（登录、租户/角色/成员/权限点变更）在 controller 加 `@Audit({ action, resource })`；表 `audit_logs` 为 append-only（RLS 禁止改删），查询走 `/starter/api/audit-logs`，管理端 `/observability/audit-logs`。规范见 `apps/server/src/audit/README.md`。
- **链路追踪**：`apps/server/src/tracing.ts` 初始化 OTel → Tempo（`OTEL_ENABLED=true` 时生效）；入站 server span 由 `TraceMiddleware` 创建（NodeAdapter 下 HTTP 插桩的 context 传不进 middleware），不要重复建 span，也不要改响应头 traceId 来源。
- 开发期接口统一用 `/api` 相对路径，由 Vite 代理到后端，**不写死后端域名**。
- 业务接口按领域命名（如 `/orders`、`/patients`），`health` 只做运维探活，不承载业务逻辑。
- 跨端共用的常量必须放 `packages/shared`：`API_PREFIX`、`API_ROUTES`、业务枚举、类型。新增接口先加常量，再由 controller 与 api 层引用，不要前后端各写一份字符串。
- 前端 HTTP 使用原生 `fetch`，不引入 axios。
- 前端样式与组件库：**管理端（`apps/admin`）允许使用 Mantine 组件库**；`apps/client`、`apps/portal` 不引入第三方 UI 组件库，样式用 Tailwind 原子类。分工见 `.opencode/skills/standards/react/SKILL.md` 的「技术栈」一节。
- 组件写法统一 `export const Comp = () => {}`，不使用 `function` 声明，不使用 `export default`。
- **先检索再开发**：新增 UI / 功能前，先看 `apps/admin/src/components`、现有 feature 与 `packages/*`；能复用就复用，不重复造轮子（表格、页面壳、用户菜单、品牌等已有底座）。
- **管理端数据表格统一用 `DataTable`，默认服务端模式**：用 `queryOptions` 让搜索/筛选/排序/分页走后端；`data` 客户端模式只用于 mock / 小数据演示。不要手写 Mantine `Table` + `Pagination`。**工具栏不要放「刷新」按钮**：搜索 / 筛选 / 分页变化本身就会重新请求，`reload()` 只用于业务动作后的重拉。
- 页面文件放在 `[业务名]/[业务名].tsx`，页面内组件放同级 `components/`。
- 后端 Controller 只做参数校验和转发，业务逻辑放 Service。
- 后端禁止 `res.status().json()` 手动返回错误，统一抛 `HttpException` 子类。
- 生成物（`dist/`、`*.gen.ts`）禁止手改，也不要加注释。
- 每个源码目录都要有 `README.md`：职责 / 文件索引 / 关联 / 同步要求。进入陌生目录先读它筛出要读的文件，再读具体代码；结论以代码为准，README 只用于导航。
- 文档、提交信息、回复使用简体中文。

## 模块导入约定

- **server 内部模块不使用 barrel（`index.ts`）**：直接引用具体文件（如 `from "./tenants.service"`、`from "../logging/request-context"`）。server 是 CJS + Nest DI，barrel 容易引入循环依赖，并破坏启动顺序（如 `tracing.ts` 必须在 `main.ts` 第一行加载）。**此约定覆盖全局默认的 barrel 规则**。
- **前端组件 / 页面目录保留 barrel（`index.tsx`）**：只 re-export，不写业务逻辑；外部从目录导入（见 `docs/guides/conventions.md`）。
- **对外包保留包入口**：`packages/shared` 用 `src/index.ts`，`packages/api` 用生成物入口，外部统一从包名导入。
- **新增源码目录仍需 `README.md`**：职责 / 文件索引 / 同步要求。

## 数据库

- 表结构遵循 [`docs/guides/database-conventions.md`](docs/guides/database-conventions.md)：业务表 `id`(uuid) + `createdAt` + `updatedAt`（`@db.Timestamptz(3)`）；关联表用联合主键、不加 `id`；`deletedAt` 只按需加。
- `pnpm schema:check` 校验模型字段约定（已并入 `pnpm build`）；不通过先修模型再提交。
- 结构变更一律 `db:migrate` + review SQL，禁止 `db push` 用于正式开发。

## 验证命令（qa 判定基线）

在仓库根目录执行：

| 命令 | 含义 | 失败即判定 |
| --- | --- | --- |
| `pnpm build` | 全部子项目构建 + 全量 typecheck | 不通过 |
| `pnpm lint` | oxlint 静态检查（apps + packages） | 不通过 |
| `GET /starter/starter/api/health` | 后端能启动并返回 `{"status":"ok"}` | 不通过 |

单测、接口测试在第一轮需求时再引入，届时补充对应脚本。

启动全部应用用根目录 `pnpm dev`：并发起 server / client / admin / portal + Penpot MCP（`@penpot/mcp`），并自动打开 `http://localhost:47100/starter/starter/api/dev` 开发导航页（端口与在线状态、Swagger 入口、依赖服务、未启动服务的启动命令）。该页仅在非生产环境注册。

Windows 下也可以直接双击 `start-dev.cmd` / `stop-dev.cmd`：启动会检查 Docker、`docker compose up -d`、等 PostgreSQL 就绪后运行 `pnpm dev`；停止会结束应用进程并 `docker compose down`（保留数据卷）。

## 目录

```text
apps/client        客户端：React + Vite + TypeScript + Tailwind（端口 47173）
apps/admin         管理端：React + Vite + TypeScript + Tailwind（端口 47174）
apps/portal        门户网站：Next.js App Router + Tailwind（端口 47175，面向未登录访客）
apps/server        后端：NestJS + TypeScript（端口 47100，路由前缀 /api）
packages/shared    共享常量、工具函数、类型（TS 源码直供，无构建产物）
packages/api       接口层：类型、SDK、错误处理
docs               需求交付物，按 docs/deliverables/<slug>/ 存放
```

## 多端边界

- PC、H5、管理端、门户可以共用 `packages/shared` 与 `packages/api`。
- 小程序、App 没有标准 `fetch`，通过 `createApiClient({ fetcher })` 注入各自的请求器，不要修改请求层实现。
- 小程序、App 不共用 Web UI 组件；共享只到类型和纯逻辑这一层。
- 需要新的端时，新建 `apps/<端名>`，复用 packages，不复制代码。
- 门户（portal）是唯一以 SEO 为目标的应用：默认 server component，不滥用 `"use client"`；其他 Web 端是纯客户端渲染。
