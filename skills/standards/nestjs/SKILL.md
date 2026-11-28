---
name: NestJS 后端规范
description: 开发 NestJS / TypeScript 后端时加载。技术栈、OIDC 认证与 RBAC 授权、多租户、Prisma、模块分层、DTO 校验、异常处理
---

# NestJS 后端规范

## 技术栈

- **框架**: NestJS 12 + TypeScript 6（2026-11-24 官网基线；TS 7 无 compiler API 不兼容 Nest CLI，见踩坑记录 #14）
- **ORM**: Prisma 7（官网方案：`prisma-client` generator + `output = "../src/generated/prisma"` + `moduleFormat = "cjs"`，兼容 CommonJS；driver adapter `@prisma/adapter-pg`；连接串与迁移配置在 `prisma7.config.ts`；生成物不入库）
- **数据库**: PostgreSQL + pgvector（单库兼顾关系数据与向量检索；向量访问封装成 `VectorStore` 接口，将来可换 Qdrant）
- **API**: RESTful（`@nestjs/swagger` 文档）
- **认证**: NestJS 官方 **`@nestjs/authentication`**（0.1.x，官网基线）——密码/email/2FA/magic link/session/access+refresh token/API key/Google OIDC，状态存自己的 PostgreSQL，**不用外部 IdP**
- **授权**: NestJS 官方 **`@nestjs/authorization`**——`@Policy()` 策略类 + `@Can()` 接口守卫

## 认证与授权分层（2026-11-24 ego 深挖官网后定案）

**前提修正**：早前用 Authentik 的判断已被推翻——官方包已覆盖全部认证能力，状态存自己的库、用户模型自己定义、多平台共用一个 server 天然共享登录态，不需要外部 IdP。

- **认证（你是谁）**：`@nestjs/authentication`。`AuthenticationModule.forRoot({ accessToken, ... })` + 自定义 `JwtBearerProvider`（`validate(claims)` 从我们 UsersRepository 按 sub 查用户）。`@Public()` 豁免、`@Authenticate()` 改要求、`@CurrentUser()` 读用户、`AuthenticationContext` 在 handler 任意层读当前用户
- **授权（你能干什么）**：`@nestjs/authorization`。`@Policy()` 类里每条 ability 是 `(user, ...args) => boolean`，`before()` hook 放行 admin；路由用 `@Can(Policy, 'ability')` 声明，服务内用 `AuthorizationService.can()/authorize()`。**没有 `@Can()` / `@Can.Anyone()` / `@Public()` 的路由会被 AuthorizationGuard 拒绝**（默认拒绝）
- **单一 server 服务**：知识库、rrweb 回放等都是同一 NestJS server 的 module（`auth / knowledge / replay / billing`），不拆多服务；共享同一 PostgreSQL 实例

### 官方认证包要点（官网一手）

- **store 契约 6 类**：sessions / refreshTokens / mfa / magicLinks / oidcStates / emailTokens。`NODE_ENV=production` 且配置了对应功能却没有 store → 启动失败；`allowInMemoryStorage: true` 仅开发用
- **原子性**：`touchSession`/`deleteSession`/`markRefreshTokenUsed` 等必须是单条条件 UPDATE/DELETE（不能读后写），官方 contract tests 用 `concurrent: true` 在 PostgreSQL 上验证
- **Google OIDC**：`oidc.providers: { google: google({ clientId, clientSecret }) }`；回调 URI 注册到 Google Cloud；生产配 `APP_URL`
- **多租户 OIDC**：`oidc.providers` 可是 `(name) => config` 函数，从 TenantsRepository 动态读 issuer/clientId/clientSecret（`GET /auth/oidc/<tenant>/login` 按租户登录）
- **微信**：非标准 OIDC，需自定义 provider（框架留口子）
- **生产清单**：HTTPS（session cookie Secure）、真实 SMTP、`app.enableCsrfProtection()`、`session.trustedOrigins`、密钥进 secret manager、scrypt 内存规划（默认 128MiB/次）、throttler 用 Redis 共享存储
- **多平台共享用户库**：每个应用的 mfa / accessToken 配置必须一致，否则一个平台开了 2FA、另一个能纯密码登录

### 多租户与 RBAC

- **租户隔离**：Prisma extension 自动给业务表注入 `where: { tenantId }`（Tenant/Permission/Plan 是全局表不注入）。`tenantId` 来源：官方包把用户从库里加载（含 tenantId），接入时把 tenantId 写进 token claim 或从 `AuthenticationContext.user` 读取（模板当前用 `TenantMiddleware` 解析 token，见 auth 模块 TODO）
- **角色权限**：`users / roles / permissions / user_roles / role_permissions` 存业务库；policy 从 `user.roles` 判断，权限变更即时生效（不依赖 token claim）
- 小程序是补充入口：`wx.login → openid → 官方认证包签 JWT`，身份统一但登录态独立（平台限制），主干复用同一套授权

## 开发规范

- **数据库迁移**：改 schema 后用 `db:migrate -- --name <语义名>` 生成 SQL 迁移文件，review 后入库；部署用 `db:deploy`（幂等）；生产禁止 `db push`。结构变更走 migrate、初始数据走 seed，边界见 `docs/guides/conventions.md` 第 5 节。
- **表字段约定**：业务表 `id`（uuid）+ `createdAt` + `updatedAt`（`@db.Timestamptz(3)`），关联表联合主键不加 `id`，`deletedAt` 按需；`pnpm schema:check` 校验，详见 `docs/guides/database-conventions.md`。
- **日志/traceId**：统一走 `apps/server/src/logging/`（pino + nestjs-pino）；所有响应头带 `X-Trace-Id` / `traceparent`，错误体带 `traceId`；请求/响应体日志需脱敏与截断（`LOG_HTTP_BODY` 控制），规范见 `docs/guides/logging-and-tracing.md`。

- **中间件通配路由**：Nest 12 禁用裸 `*`；`forRoutes("*")` 叠加全局前缀会变成 `/api/*`，触发 `LegacyRouteConverter` 警告。用命名通配 `forRoutes("{*splat}")` 覆盖全部路径（官方 Middleware → Route wildcards，见踩坑记录 #25）。
- 模块按领域拆分：`<feature>/<feature>.module.ts | .controller.ts | .service.ts | dto/ | repositories/`，每个目录有 README；完整目录模板与构件放置见 `docs/guides/server-module-architecture.md`
- **构件放置**：Controller/Service/Repository 放模块内；Middleware/Filter/Pipe/Guard/Interceptor/自定义装饰器能局部就放模块内，跨模块复用的才放 `src/common/`；DTO 放 `<feature>/dto/`，跨模块复用放 `src/dto/`
- 使用 Prisma Schema 定义数据模型，通过 `prisma generate` 同步类型（生成物在 `src/generated/prisma`，随应用编译）
- **schema 多文件组织**：主文件 `prisma/schema.prisma` 只放 generator/datasource/enum；模型按领域拆到 `prisma/models/*.prisma`（tenant/user/rbac/billing）。**`prisma.config.ts` 的 `schema` 必须指向目录 `"prisma"`（不是文件）**，否则 models/ 下的模型被静默忽略（Prisma 7 官方坑，见踩坑记录 #21）。跨文件关系无需 import，Prisma 自动合并；换组织方式后跑 `prisma migrate status` 确认无新迁移
- 服务内从 `../generated/prisma/client` 导入 `PrismaClient`，构造时传 driver adapter；不要再写 `@prisma/client` 导入或 schema 里的 `url = env(...)`
- Controller 只做参数校验和路由转发，业务逻辑放在 Service 层；Controller 返回 response DTO，不直接返回 Prisma 实体
- 使用 `class-validator` + `class-transformer` 做 DTO 校验；入参 DTO 与出参 DTO 分开，字段加 `@ApiProperty`
- **Swagger 契约**：每个方法 `@ApiOperation` + 成功响应 `@ApiOkResponse`/`@ApiCreatedResponse`（必须带 `type`），错误响应用共享 `ErrorResponseDto`；改完接口运行 `pnpm api:generate`
- **租户路由**：`/api/t/:tenantId/...` 必须挂 `TenantMembershipGuard` + `TenantTransactionInterceptor`；控制器用 `@TenantTx()` 取事务客户端并传给 Service/Repository，参数名必须是 `tenantId`
- 全局异常过滤器统一处理错误响应格式（引入后放 `src/common/filters/`）

## 错误处理

- **禁止在控制器中使用 `res.status().json()` 手动返回错误**，必须使用 `throw new AppHttpException()` 抛出异常
- 异常格式：`throw new AppHttpException({ message: '错误信息' }, HttpStatus.NOT_FOUND)`
- API 层使用 Nest HttpException，配合正确的 HttpStatus
- 控制器中避免抛出原始 Error，应该包装后返回有意义信息
