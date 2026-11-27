# test — 接口与数据库验收脚本

## 职责

用真实 PostgreSQL 验证登录、租户边界与 RLS 隔离（无测试框架依赖，直接用 Node 运行）。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `tenancy-e2e.mjs` | 登录闭环 + 租户端点（AC5 / E1~E3 / RLS 应用层），12 项断言 |
| `rls-concurrency.mjs` | RLS S4：真实双租户 30 并发 + 未设置变量负向用例，断言 0 串数据 |

## 运行前提

- PostgreSQL 已启动，迁移已应用（`db:deploy`），seed 已执行（`db:seed`）
- 应用连接用非 superuser 的 `app_rw`（见 `docker/init-db.sql`），否则 RLS 不生效
- 服务已启动（`pnpm --filter @starter/server start`）

## 同步要求

- 新增租户/认证端点时同步补 `tenancy-e2e.mjs`
- 新增带 `tenantId` 的业务表时同步补 `rls-concurrency.mjs` 的测试租户数据
- 脚本自行加载项目根 `.env`，可用 `API_BASE` / `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` 覆盖
