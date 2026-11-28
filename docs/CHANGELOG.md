# 变更记录

记录仓库与 npm 包 `yyx-agent-kit` 的版本变更。格式参考 Keep a Changelog。

## [Unreleased]

- **DataTable 列按需显示**：新增 `selectable`（默认 false）与 `ColumnDef.hidden`；没有批量操作的表不再显示勾选列，没有操作能力的页面不再显示操作列；成员/用户/文件按权限动态启用，只读账号不再出现空操作列
- **导航与账号入口收口**：租户切换移入用户信息面板；账号设置从导航移除，统一从用户面板进入；删除无用的 `/integration` 页面；权限点页面改为只读（权限点由后端 seed/迁移维护）
- **EGO 全账号验收 + 平台运维只读修复**：实际登录并操作 8 个演示账号；发现 `ops` 可创建租户，已给租户/用户/权限点的写接口补 `@RequirePlatformAdminLevel("super")`，管理端同步隐藏 ops 的写按钮；验证成员添加/移除、文件上传/删除、多租户切换、停用/禁用账号与页面门禁
- **测试租户清理命令**：新增 `db:cleanup:test-tenants`，默认 dry-run，`-- --apply` 硬删除软删除的测试租户（e2e/audit/prov/ui/ego/qa/test）并级联角色/成员/文件/订阅；默认保留 `default`、`demo-b` 与审计日志，`--purge-audit` 通过 `MIGRATE_DATABASE_URL` 清空审计表；开发面板「工具 → 数据库维护」提供预览 / 清理测试租户 / 清空审计日志按钮
- **租户软删除状态统一**：`DELETE /tenants/:id` 现在同时写 `status=suspended` + `deletedAt`；历史软删除租户通过迁移统一为 `suspended`，避免只依赖 `deletedAt` 拦截
- **租户自助成员管理 + 演示账号**：管理端新增「权限管理 → 成员」，跟随全局租户切换器，复用 `TenantMembersContent`，租户管理员可添加已存在账号、分配角色、停用/移除成员；新增 `db:seed:demo`，创建平台超管/运维、租户管理员、普通成员、文件角色、多租户、停用成员、禁用账号，统一密码 `demo_pwd_2026`；演示租户统一为「演示租户 A（default）/ 演示租户 B（demo-b）」；开发导航页「工具 → 演示账号」可一键重置（`POST /dev/seed-demo`）；凭据文档同步
- **SaaS 账号模型说明**：新增 `docs/guides/identity-tenant-model.md`，用 ER 图、管理员建账号流程图和鉴权链路图说明 `User` / `Tenant` / `UserTenant` / `Role` / `Permission` 的关系与当前边界
- **管理端导航统一为单棵菜单树**：新增 `lib/navigation.ts` 的 `NAV_TREE` + `useNavigation()`，嵌套侧栏 / 双栏侧栏 / 顶部大菜单只渲染同一棵树；`platformOnly` / `permission` 过滤与空分组隐藏集中处理；工作台提升为一级菜单，文件/日志/审计等统一归入「系统」
- **租户暂停立即生效**：`TenantMembershipGuard` 现在要求租户 `status=active` 且未软删除；租户被平台暂停后，成员已签发的 token 访问 `/t/:tenantId/*` 直接 404；补充 `test:tenants` 暂停/恢复回归
- **开发导航页服务列表重做**：服务区改为每个服务一行卡片（名称、分组、端口、入口、启动命令、本地凭据），概览与「服务」视图共用；修复页面内 `API_PREFIX` 未定义导致的轮询报错；同步文档中的开发页路径
- **本地可观测性默认启动**：`docker compose up -d` 现在默认包含 Loki / Alloy / Tempo / Grafana；只需要最小依赖时用 `docker compose up -d postgres redis`；移除 Loki 无效的 shell healthcheck（镜像无 `/bin/sh`）；同步启动脚本、开发导航命令、测试前置说明与文档
- **文件上传**：新增租户文件模块 `/t/:tenantId/files`（列表 / multipart 上传 / 下载 / 删除）；元数据表 `files`（RLS）与 `FileStorage` 抽象，默认本地磁盘 `FILES_DIR`；限制 20MB 与图片/PDF/文本/Office/ZIP 白名单，拒绝 HTML/SVG；下载强制 attachment + nosniff；权限点 `file:read` / `file:write`；管理端新增「文件」页（搜索、类型筛选、上传、下载、删除）；新增 `test:files`
- **全站 API 限流**：新增 `common/guards/rate-limit.guard.ts`（`APP_GUARD`，IP + Controller.method 固定窗口，默认 120 次/60 秒）；`@RateLimit()` 覆盖单路由、`@SkipRateLimit()` 跳过（健康检查）；`TRUST_PROXY` 支持反向代理真实 IP；新增开发探针与 `test:rate-limit`
- **登录设备 / 服务端会话**：新增 `user_sessions` 表与 Prisma `SessionStore`；登录创建会话并把 `sid` 写入 JWT，`JwtAuth` 每次校验会话（撤销立即生效）；新增 `/me/sessions` 列表 / 撤销 / 退出其他设备；管理端「账号设置」增加登录设备卡片；改密后 `revokeAll` 所有会话；新增 `test:sessions`
- **登录失败锁定**：新增 `RedisModule` / `LoginThrottleService`，按「邮箱+IP」和「IP」双维度计数（默认 5 次 / 5 分钟，锁 15 分钟，IP 阈值 30）；登录成功清零邮箱+IP；Redis 不可用时 fail-open；登录页展示 429 文案；新增 `test:throttle` 并纳入 CI
- **账号自助与安全**：新增 `PATCH /me`（显示名）与 `POST /me/password`（校验旧密码、至少 8 位、新旧不能相同）；管理端「账号设置」页接入个人资料与修改密码；审计 `user.profile.update` / `user.password.change`；新增 `test:profile` 并纳入 CI
- **管理端导航一致性**：HeaderMegaMenu 接入 `useMenuAccess`，平台菜单与日志菜单按 `isPlatformAdmin` 过滤，角色菜单按当前租户 `role:read` 过滤；设置入口统一改为「账号设置」
- **Penpot 独立化 + 通用 skill**：Penpot 从 `templates/base/docker-compose.yml` 拆到仓库级 `tools/penpot`（独立 compose、`start.ps1` / `stop.ps1` / `start-mcp.ps1`，可被多个项目共用）；模板 compose 只保留 PostgreSQL/Redis，`pnpm dev` 不再启动 Penpot MCP；数据卷迁移到 `yyx-penpot-*`（验证 1 profile / 1 project / 7 files / 916 个资源文件）；Penpot skill 改为项目无关，支持 `install-skill.ps1` 安装到全局 OpenCode skills；同步 dev 导航页、凭据、conventions 与 README
- **server 目录规范统一**：`audit` / `permissions` / `users` 的 Repository 移到 `repositories/`；`/me` 从 `auth` 迁到 `users/me.controller.ts`，profile/tenants 查询下沉到 users repository；auth 仓储改名 `AuthUsersRepository`，消除与平台 `UsersRepository` 重名；补齐 `users/dto`、`tenants/members`、`tenants/roles` 等缺失 README；架构文档补充基础设施模块例外
- **tenancy 子模块化**：`members/`、`roles/`、`permission-catalog/` 改为真正的 Nest 子模块；新增 `TenancyCoreModule` 统一提供租户事务拦截器；`permissions/` 改名 `permission-catalog/`，类名加 `TenantPermissionCatalog*` 前缀；Repository 统一归到 `repositories/`；平台模块从 `TenancyModule` exports 复用 Service
- **租户引导与平台级成员管理**：新建租户自动初始化 `admin` / `member` 角色（seed 共用 `provisioning/role-templates.ts`）；`POST /tenants` 支持 `initialAdminEmail`，租户 + 角色 + 初始管理员同一事务；新增 `/tenants/:tenantId/members` 与 `/tenants/:tenantId/roles/options`，平台管理员可跨租户引导/恢复，写操作仅 `super`，并保护最后一个管理员；`/me` 增加 `platformAdminLevel`；管理端建租户支持初始管理员、成员页按平台/租户模式复用；新增 `test:provisioning`
- **导航菜单权限收敛 + 全局当前租户**：新增 `TenantProvider` / `useTenant()`（当前租户持久化，角色页与导航共用）、`TenantSwitcher` 导航栏切换器与 `useMenuAccess()`；平台菜单按 `isPlatformAdmin` 隐藏，角色菜单按当前租户 `role:read` 隐藏；角色页移除独立租户下拉，跟随全局切换器；租户成员页同步当前租户并隐藏切换器；无权限菜单项不再显示
- **管理端前端权限消费**：新增 `TenantPermissionsProvider` / `usePermissions()`、`<Can>`、`<PermissionGate>`、`<PlatformAdminGate>` 与统一 403 内容；成员页按 `user:write`、角色页按 `role:write` 隐藏新建 / 编辑 / 删除 / 批量操作；用户、租户、权限、日志、审计页统一平台管理员门禁；新增 `GET /me` 返回 `isPlatformAdmin`；`test:authz` 增加 `/me` 断言
- **接口级权限校验**：新增 `@RequirePermission(...codes)` 与 `TenantMembershipGuard` 权限检查（权限来自当前租户角色并集，`owner`/`admin` 视为 `["*"]`）；租户成员 / 角色 / 权限目录接口改用权限点授权（`user:read`/`user:write`、`role:read`/`role:write`）；`/membership` 返回 `permissions`；新增 `test:authz` 验证“同一 token 授权后即时生效”，并纳入 CI
- **权限点管理模块**：新增 `src/permissions/`（`/permissions` 平台管理员 CRUD：分页 / 搜索、code 唯一且创建后不可改、被角色引用时禁止删除、审计 before/after）；租户权限目录控制器改为 `TenantPermissionsController`，避免与平台接口生成客户端重名；管理端「权限」页接入真实接口（服务端 DataTable、新建 / 编辑 / 删除、按 code 前缀分组、引用数保护）；新增 `test:permissions` 并纳入 CI
- **租户角色管理模块**：新增 `src/tenancy/roles/` 与 `src/tenancy/permissions/`（`/t/:tenantId/roles` 分页 / 类型筛选 / 搜索、自定义角色 CRUD、角色权限整体替换、权限点目录；内置角色只读、code 租户内唯一、删除前检查成员占用）；原 `GET /roles` 精简列表改为 `/roles/options`，成员页同步切换；管理端「角色」页接入真实接口（租户切换、服务端 DataTable、新建 / 编辑 / 删除、权限多选）；新增 `test:roles` 并纳入 CI
- **租户成员管理模块**：新增 `src/tenancy/members/`（`/t/:tenantId/members`：分页 / 成员状态 / 搜索、按邮箱添加、角色与租户内状态更新、移除成员；admin/owner 才能写，不能改/删自己）；管理端租户列表新增「成员」入口与 `/access/tenant-members/:tenantId` 页面（服务端 DataTable、添加 / 编辑 / 停用 / 批量操作）；新增 `test:members` 并纳入 CI
- **用户管理模块**：新增 `src/users/`（`/users` 平台管理员 CRUD：分页 / 状态 / email、displayName 搜索 / 邮箱唯一 / 密码哈希 / 删除保护）；管理端「用户」页接真实接口（服务端 DataTable、新建 / 编辑 / 禁用 / 批量启用禁用删除）；新增 `test:users` 并纳入 CI
- **前端镜像与网关**：admin / client 用 nginx 静态镜像（内置 `API_PREFIX` 反代），portal 用 Next 镜像；新增 Caddy 网关按 Host 路由与 compose 的 admin/client/portal/gateway；本地默认 `admin.localhost:47180` / `client.localhost:47180` / `portal.localhost:47180`
- **API 前缀按应用名**：`API_PREFIX` 改为 `/<APP_NAME>/api`（模板默认 `/starter/api`，CLI 生成项目自动替换为项目名）；server 路由 / Swagger / Vite & Next 代理 / dev 页 / 测试 / CI 与容器健康检查同步更新，避免单域多项目时 `/api` 冲突
- **构建产物目录统一**：admin / client 输出到 `dist/admin`、`dist/client`，portal 用 `distDir: dist/portal`；server 保留 `apps/server/dist`（tsc/生产镜像入口绑定）
- **生产镜像与编排（server）**：多阶段 Dockerfile（生产依赖、非 root、HEALTHCHECK）、entrypoint 启动前 `prisma migrate deploy`、可选幂等 seed；新增 `docker-compose.prod.yml` 与 `.env.production.example`；`pg` / `prisma` / `dotenv` 移到 dependencies
- **CI**：新增 `.github/workflows/ci.yml`（根仓库校验模板）与 `templates/base/.github/workflows/ci.yml`（模板自带，生成项目后可用）；自动 install → init DB → migrate/seed → api generate → build → lint → 起 server → 全部 e2e
- **日志系统归档 + 业务打印规范**：新增 `docs/guides/logging-conventions.md`（级别 / 字段 / 接口写法 / 禁止清单）与 `docs/deliverables/20261128-observability-logging/` 归档记录；pino redact 补充 `x-api-key` / `proxy-authorization`
- **审计 before 快照 + DataTable 刷新规范**：更新/删除前在 service 调 `RequestContext.setAuditBefore(旧值)`，审计详情同时展示 before/after；移除日志页与审计页工具栏「刷新」按钮（搜索/筛选即刷新），AGENTS 与 DataTable README 明确该规范
- **日志轮转与告警**：本地文件改用 `pino-roll`，按天/50m 切分（`app.YYYY-MM-DD.N.log`），保留 7 个（`LOG_ROTATE_*`）；Grafana provisioning 新增两条告警规则（错误日志 >10/5m、慢请求 >5/5m），状态 `health=ok`
- **开发导航页统一展示本地凭据**：`/api/dev#services` 的「本地凭据」卡片覆盖 server 测试账号、PostgreSQL（应用 + 管理）、Redis、Penpot、Grafana；点击值复制；凭据从 `.env` / `DATABASE_URL` 解析，仅开发环境返回
- **Grafana 概览与本地凭据**：Grafana 固定 12.4.16（13.x 的 Loki/Tempo bundled 插件在 Explore 加载失败）；默认账号 `admin` / `starter_grafana_2026`，开发导航页新增「本地凭据」卡片（可点击复制）；新增预置 Dashboard「Starter 概览」（日志量 / 错误数 / 按 level 曲线 / 告警日志），dev 页 Grafana 入口指向该概览
- **链路追踪（OTel + Tempo）**：`src/tracing.ts` 初始化 `@opentelemetry/sdk-node`，OTLP → Tempo（47113 查询 / 47114 OTLP HTTP）；NodeAdapter 下 HTTP 插桩的 context 传不进 middleware，改由 `TraceMiddleware` 创建 server span 并用 `context.with` 包裹请求链，日志 traceId 与 Tempo 一致；关闭 `instrumentation-nestjs-core`（不支持 Nest 12）/ `fs`，logs/metrics 不重复导出；新增 Tempo compose 服务、Grafana 数据源与 `test:traces` 验收
- **慢查询采集**：Prisma 7 + driver adapter 下 `$on("query")` 不可用（实测 `_engineConfig` undefined），改用 `scoped` extension 计时 + 租户事务整体计时；`SLOW_SQL_MS`（默认 100ms）/ `SLOW_SQL_LOG_PARAMS`（默认关闭），日志带 traceId / model / operation
- **审计日志**：新增 `audit_logs`（append-only，RLS 禁止改删）与 `apps/server/src/audit/`；`@Audit({ action, resource })` 自动记录租户 CRUD，登录成功/失败在 `CredentialsService` 显式记录（含 traceId / ip / userAgent）；新增 `GET /api/audit-logs`、`/api/audit-logs/:id` 与管理端「审计日志」页 `/observability/audit-logs`；`test:audit` 验收
- **可观测性（Loki）**：compose 新增 `observability` profile（Loki 47110 / Grafana 47111 / Alloy 47112），Alloy 采集 `logs/app.log`；pino 输出字符串 level 并支持 `LOG_FILE` 双写。新增 `/api/logs`、`/api/logs/stats`、`/api/logs/trace/:traceId`（平台管理员，Loki 只读）与管理端「日志」页 `/observability/logs`（DataTable 服务端模式 + 详情抽屉 + trace 时间线）
- **日志与 traceId**：接入 pino + nestjs-pino（NodeAdapter 实测通过），每个响应返回 `X-Trace-Id` / `traceparent`，错误体带 `traceId`；请求/响应日志含 userId/tenantId、脱敏与 16KB 截断，4xx warn / 5xx error；`/api/dev` 不写 completion log。新增 `src/logging/`、`docs/guides/logging-and-tracing.md` 与 `LOG_*` 环境变量

- **数据库字段规范**：业务表统一 UUID `id` + `createdAt`/`updatedAt` + `@db.Timestamptz(3)`；关联表保持联合主键、不加 `id`；`deletedAt` 按需。新增 `pnpm schema:check`（已并入 `pnpm build`）与 `docs/guides/database-conventions.md`；迁移 `20261128030929_standardize_timestamps` 补齐 Plan/Permission/OAuthConnection/PlatformAdmin 时间字段
- **Tenant 软删除**：`Tenant.deletedAt` + `slug` partial unique index（Prisma 7 `partialIndexes` preview），删除改为软删、slug 可复用；列表/详情/租户守卫/`/me/tenants` 全部过滤，seed 按 id 恢复默认租户。迁移 `20261128042000_soft_delete_tenant`

- **Penpot 统一为本地 MCP**：移除 compose 的 `penpot-mcp` 容器与 `enable-mcp` flag（远程模式弃用，不再维护 key）；新增 `pnpm penpot:mcp`（`npx -y @penpot/mcp@2.17.0`）起 4400 插件/4401 MCP/4402 WS，全局 `opencode.json` 指向 `http://localhost:4401/mcp`；插件用 **Plugins → Load from URL** 加载；`tools/penpot/README.md`、penpot skill、conventions 同步
- **MCP 配置调整**：移除 `open-design`（生成流水线不可靠，规则改为通用设计原则）；接入 `MCP_DOCKER`（`docker mcp gateway run`，已 connected）；conventions / agent-system / penpot skill 与 README 同步
- **Penpot 本地开发账号**：用官方 CLI 创建 `dev@penpot.local` / `penpot_dev_pwd_2026`（`--skip-tutorial --skip-walkthrough`，本地免邮件验证），凭据记入 `docs/guides/credentials.md`；生产必改清单同步
- **接入 Penpot 设计工具**：Penpot 服务合并进 `templates/base/docker-compose.yml`（独立 PG15/Valkey/容器名与卷前缀，端口 9001/8025，随本地依赖一起 up）；新增 `skills/tools/penpot/SKILL.md` 与工具索引条目；本地免 key MCP（npx + 浏览器插件）配置写入全局 opencode.json，token 不进仓库；conventions 与 agent-system 同步
- **移除 todos 示例模块**：工作台与客户端只显示公开的 `/api/health`；删除后端 `todos.controller.ts` / `todos.service.ts` / `todo.policy.ts` 与 `app.module.ts` 注册，删除 shared 的 `Todo`/`TODO_STATUS`/路由常量和 api client 的 `todos()`；README、AGENTS、workspace skill、conventions 的示例同步；历史需求文档保留原样
- **去掉独立首页，工作台即默认页**：`routes/index.tsx` 改为渲染 `DashboardPage`，删除 `routes/dashboard.tsx` 与 `features/home/`；三种导航的「首页」项移除，「工作台」指向 `/`；Brand 点击回工作台；现行目录约定同步
- **新增统一 Brand 组件**：三种导航都有 Logo——嵌套侧栏头部与顶栏左侧用完整形态（`S starter`），双栏图标栏用 compact 形态（仅图标）；点击回首页，纯 CSS 渐变方块不依赖图片；顶栏菜单仍绝对居中
- **顶部大菜单居中**：品牌左、菜单绝对居中（`left:50%` + `translateX`）、用户区右，不受两侧宽度影响；用户入口只在桌面显示，移动端由抽屉提供，避免重复
- **精简菜单模式为三种**：删除重复的 `HeaderMenu`（顶部菜单），只保留 `HeaderMegaMenu`（顶部大菜单）；`AdminLayoutMode` / `LAYOUT_MODES` / 用户面板的「导航菜单模式」同步去掉「顶部菜单」项；现行文档的组件清单同步（历史需求记录保留原样）
- **双栏侧栏结构与宽度**：左侧改为上 logo / 中一级图标菜单（`AdminScrollArea` 占满并可滚动）/ 下头像；宽度按模式各自决定——单栏 `260`，双栏 = 图标栏 `60` + 二级菜单 `200`（总 260），不再共用一个外层固定宽度；修复 `DataTableCardList` 中 `Text`（默认 `<p>`）包裹 `Badge`（`<div>`）导致的嵌套错误，改为 `component="span"`
- **双栏布局用户信息收窄为头像**：`UserMenu` 新增 `icon` 形态（只渲染头像，置底于一级图标菜单），`DoubleNavbar` 从文字子导航底部移除整行用户信息；四种形态分别对应四种菜单模式
- **修复双栏侧栏激活组**：`DoubleNavbar` 原来用 `useState("概览")` 写死激活组，进入「用户管理」时侧栏仍显示概览组、当前页不高亮；改为 `useLocation()` 从当前路由推导激活组，图标点击跳到该组首屏；ego 四种菜单模式逐项审查确认
- **页面背景与布局模式入口**：页面级背景设在 `src/index.css` 的 `body` 上（`gray-0`/`dark-8`），侧栏组件自己用 white/`dark-6` 形成区分，不再只给内容区局部设色（`AdminLayout.module.css` 已删除）；新增 `components/LayoutMode` 纯 Provider 暴露菜单模式状态；UserMenu 面板加「导航菜单模式」子菜单，移除调试用浮动切换按钮；侧栏分隔线只由导航组件自己的 `.navbar` 画（light-dark 自适应），移除 AdminLayout 外层重复的固定 gray-3 边框；约定写入 conventions 第 6 节
- **修复交互元素光标**：admin 入口用 `createTheme({ cursorType: "pointer" })`（Mantine 9 默认 `default`，Button / Checkbox / Pagination / UnstyledButton 悬停都不是小手）；浏览器实测各类元素 cursor 均为 pointer；写入 conventions 第 6 节与踩坑 #26
- **新增 UserMenu 用户信息组件**：三种形态（`sidebar` / `header` / `drawer`）覆盖四种菜单模式——两种侧栏底部、两种顶栏右侧、移动端抽屉底部；点击展开 Mantine Menu 面板，含用户信息、主题设置（浅色/深色/跟随系统，官方 `setColorScheme`）、设置跳转、退出登录（未接认证时禁用标注）；模板示例用户由调用方注入替换；浏览器验证四种布局均可见、主题切换生效
- **admin 滚动条可预测化**：新增 `AdminScrollArea`（Mantine 自定义覆盖层滚动条，默认配置，不用原生滚动条）；替换 AdminLayout 主内容区、`NavbarNested` / `DoubleNavbar` 侧栏、`HeaderMenu` / `HeaderMegaMenu` 移动菜单、`DataTableTable` 表格容器；约定写入 `conventions.md` 第 6 节
- **PageShell 去掉 Paper**：壳只提供位置（内容槽的 padding 与 min-height 留在 CSS），边框/背景/阴影等视觉表面交由页面内容自己决定；占位内容 `PlaceholderContent` 自带 Paper 面板
- **DataTable 改为 Headless 设计**：`useDataTable` 接收完整配置并返回 `DataTableApi<TRow>`，视图组件显式收 `table` prop、类型从实例推断；`DataTable` 换成纯 `DataTableProvider`（不渲染 DOM），`useDataTableApi` 兼容显式 props 与 Provider 两种用法，消除「必须在内部使用」的硬约束与 `unknown` 类型强转
- **DataTable 封装批量操作条**：新增 `DataTableBatchBar`（ActionBar + 确认弹窗 + 清空选中），业务只给 `DataTableBatchAction[]`；`UsersContent` 移除内联的 ActionBar/Modal/批量 state，改用动作清单；`labels` 补 batchTitle/cancel/confirm
- **新增阶段 4「代码审查」**：流水线从五阶段扩为六阶段—— chief 用新增 `code-review` skill 独立审查 general 写的代码，产出 `04-code-review.md`，结论「通过」才准派 qa；原测试回归/归档顺延为阶段 5/6，文件名同步改为 `05-test-*`/`06-record.md`（6 个历史 slug 的文件一并重命名）。同步更新 product-pipeline / chief / qa（含模板副本）、qa-regression / archive / tooling skill、agent-system 说明、docs 地图与交付物 README、模板 README；历史需求不补造审查记录
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
