# 智能体工作约定

跨需求复用的工作规则集中在这里，按类别组织。一次性环境问题见 [踩坑记录](pitfalls.md)，需求交付流程见 [产品交付流水线](../skills/flows/product-pipeline/SKILL.md)，具体工程的硬规则见各项目 `AGENTS.md`。

## 1. 信息获取与结论判定

### 1.1 一手来源优先

查技术用法时，优先查**所用库/框架的官方文档与配置字段表**，而不是上层框架的封装文档——后者往往只覆盖主流路径。典型例子：NestJS 官网的 Prisma 章节是 ESM + SQLite 语境，通篇没写 CommonJS 的 `moduleFormat` 选项，只看它就会漏配。

### 1.2 下「不可行」结论前多方交叉验证

判定「做不了 / 不支持 / 不可行」之前，按顺序做三件事：

1. 查一手文档：官方参考手册、配置字段表，不用二手转述。
2. 交叉验证一个独立来源：GitHub issue/discussion、官方示例仓库、另一份官方文档。
3. PoC 失败先排查「是不是漏配了选项」，不要把「默认配置跑不通」等同于「方案不可行」。

背景是踩坑记录 #19：只查 NestJS 二手文档 + 默认配置 PoC 报错，就误判「Prisma 7 不能按官网升级」，实际显式 `moduleFormat = "cjs"` 即可。AI 尤其容易犯这个错——一次报错看起来就是铁证。

### 1.3 用官方脚手架，不手写配置

新建项目或引入框架时，先跑官方脚手架（`create-vite` / `create-next-app` / `nest new`）拿到当前正确的模板，再往 monorepo 规范上改。经验会过时，例如 TS 7 移除了 compiler API 导致 Nest CLI 跑不了。

## 2. 技术引入与版本升级

- 引入框架/工具、升级版本前，先查官网当前最新用法与版本要求，不靠记忆。
- 显式锁版本，避免 `latest` 指向 pre-release——Prisma 的 `latest` 已指向 8.0.0-rc，必须显式装 `@7`。
- 用完一手文档后按第 1.2 节交叉验证，再下结论。

## 3. 模板与规范同步

`templates/base` 里新增或变更的技术与约定（Prisma、RBAC、OIDC、Docker、数据库选型等），必须同步反映到 `agents/` 与 `skills/standards/`。两者是一体的，不能只改模板不改规范。

## 4. 开发环境与服务

- 本地依赖服务用项目自带 `docker-compose.yml`，不用全局容器（见各项目 `AGENTS.md`）。
- 开发服务用标准后台任务启动（`pnpm dev:server` 等），需要时用一次探活确认，不要反复轮询。
- 改配置后用 `/reload`；全局 `agents/` 目录首次新建需 `opencode service restart` 一次。

## 5. 数据库迁移

结构变更走 Prisma Migrate，不再用 `db push` 直接同步。

| 场景 | 命令 |
| --- | --- |
| 改 schema 后生成迁移 | `pnpm --filter @starter/server db:migrate -- --name <语义名>` |
| 部署 / CI 应用迁移 | `pnpm --filter @starter/server db:deploy`（幂等） |
| 写初始数据 | `pnpm --filter @starter/server db:seed`（幂等 upsert） |
| 一次性原型验证 | `prisma:push`（仅限临时，禁止生产） |

边界：

- `migrate` 管表结构（DDL），`seed` 只管初始业务数据，各自独立
- 迁移 SQL 入库即代码，必须 review；已应用迁移禁止手改，修正走新迁移
- 生产禁止 `db push`；回滚写反向迁移，不靠 push 抹平
- seed 的 `update` 只覆盖展示字段，不覆盖 `code` / `isSystem` 等标识或控制字段
- 权限点 `code` 是不可变标识，变更走「新增 → 废弃 → 数据迁移」
- 新租户的角色初始化不放 seed，放租户创建业务逻辑

## 6. 发布与文档入口

- 发版手动流程与 npm 包结构：[README.md](../README.md) 的「创建新项目」「发布 CLI」章节。
- 全局偏好（pwsh、代理、mise 等）：`~/.config/opencode/AGENTS.md`。
