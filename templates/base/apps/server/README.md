# server — NestJS 后端

## 职责

REST API + 多租户隔离 + 认证授权。端口 `47100`，路由前缀 `/api`。

## 目录

| 路径 | 作用 |
| --- | --- |
| `src/main.ts` | 启动：加载 env、全局前缀/管道、Swagger、listen（配置从 `ConfigService` 取） |
| `src/app.module.ts` | 根模块：装配 Config / Prisma / Auth / Tenancy / Tenants，注册租户 middleware |
| `src/config/` | `@nestjs/config`：命名空间配置、启动时 env 校验 |
| `src/dev/` | 本地开发导航页 `/starter/starter/api/dev`（仅非生产环境注册） |
| `src/common/` | 跨模块共享构件（filters / guards / interceptors / pipes / decorators / middleware）；按需创建 |
| `src/dto/` | 跨模块共享 DTO（错误响应、分页等） |
| `src/swagger.ts` | OpenAPI 文档构建（main 与导出脚本共用） |
| `src/prisma/` | Prisma Client、`scoped` 守卫、RLS 事务入口 |
| `src/logging/` | pino 请求日志、traceId/响应头、请求响应体脱敏、全局异常过滤器 |
| `src/auth/` | 登录、JWT、租户成员 guard、租户上下文 |
| `src/tenancy/` | `/t/:tenantId/...` 示例路由、租户成员 / 角色 / 权限点、租户事务拦截器、`@TenantTx()` |
| `src/tenants/` | 平台级租户 CRUD（`/starter/api/tenants`），`PlatformAdminGuard` 保护 |
| `src/users/` | 平台级用户管理（`/starter/api/users`），`PlatformAdminGuard` 保护 |
| `src/permissions/` | 平台级权限点管理（`/starter/api/permissions`），`PlatformAdminGuard` 保护 |
| `prisma/` | schema、models、migrations、seed |
| `scripts/` | 一次性脚本（`export-openapi.ts`） |
| `test/` | 接口与数据库验收脚本 |

**新增业务模块的目录与分层规范见 [docs/guides/server-module-architecture.md](../../docs/guides/server-module-architecture.md)。**

## 常用命令

```bash
pnpm --filter @starter/server dev            # 开发
pnpm --filter @starter/server build          # 编译
pnpm --filter @starter/server start          # 运行 dist
pnpm --filter @starter/server typecheck
pnpm --filter @starter/server schema:check   # 模型字段约定（id / 时间戳 / timestamptz）
pnpm --filter @starter/server prisma:generate
pnpm --filter @starter/server db:deploy      # 应用迁移（MIGRATE_DATABASE_URL）
pnpm --filter @starter/server db:seed
pnpm --filter @starter/server test:e2e       # 登录 + 租户边界
pnpm --filter @starter/server test:users     # 平台用户 CRUD
pnpm --filter @starter/server test:members   # 租户成员管理
pnpm --filter @starter/server test:roles     # 租户角色与权限分配
pnpm --filter @starter/server test:permissions # 平台权限点管理
pnpm --filter @starter/server test:rls       # RLS 并发
pnpm --filter @starter/server test:generated # OpenAPI 生成客户端联动
```

## 关联

- 模块目录、构件放置、接口与 DTO 规范：[`docs/guides/server-module-architecture.md`](../../docs/guides/server-module-architecture.md)
- 认证/租户/RLS 的约束见 `src/auth/README.md`、`src/prisma/README.md`、`src/tenancy/README.md`

## 同步要求

- 新增 `src/*` 目录必须有 `README.md`。
- 接口变更后运行 `pnpm api:generate`，同步 `packages/starter/api/openapi.json`。
- 新增租户表必须补 RLS 迁移，并在 `prisma/README.md` 记录。
- 改 `prisma/models/*.prisma` 后运行 `pnpm --filter @starter/server schema:check`；字段规范见 [`docs/guides/database-conventions.md`](../../docs/guides/database-conventions.md)。
