# 数据库迁移规范 PRD

## 1. 背景与目标

模板目前只有 `prisma db push`：改了 schema 直接同步到库，没有迁移文件、没有变更历史。权限系统的表（租户/用户/角色/权限/套餐）是多环境共享的基础数据，这种「无历史同步」会带来四个实际问题：无法 review 结构变更、dev/test/prod 各自 push 导致结构漂移、误删列不可回滚、权限点改名这类数据变更完全无法表达。

上一需求已把模板升到 Prisma 7，`prisma7.config.ts` 里配了 `migrations.path` 但从未使用。现在把它用起来，以权限系统为载体建立迁移规范。

一句话目标：**把数据库结构变更从 `db push` 直接同步改为 Prisma Migrate 迁移文件驱动，让每次结构演进有 SQL 可审、按顺序应用、多环境一致。**

## 2. 用户与场景

- **模板使用者（开发者）**：改了 `schema.prisma` 后，需要生成一条可审查的迁移，而不是把变更直接推到库里。
- **CI / 部署执行者**：拿到一批已提交的迁移文件，按顺序应用到目标库，重复执行不产生副作用。
- **代码审查者**：能在 PR 里看到迁移 SQL，判断是否有删列、数据丢失风险。

当前替代方案是 `db push + seed`，痛点如上。

## 3. 范围

### 3.1 本期做

- F1 开发期用 `prisma migrate dev` 生成迁移文件
- F2 部署期用 `prisma migrate deploy` 应用迁移
- F3 迁移文件规范（命名、入库、review、禁止手改已应用迁移）
- F4 seed 职责收窄（只管初始数据，update 限于展示字段）
- F5 文档与规范同步（credentials / conventions / nestjs skill / CHANGELOG）

### 3.2 明确不做（非目标）

- 不改任何业务表结构（本期只换「变更方式」，不换「表设计」）
- 不引入新数据库、不拆库
- 不改认证/授权方案
- 不实现「新租户自动初始化角色」的业务逻辑（作为后续规范标记，本期只在文档里写明边界）
- 不搭建 CI 的 migrate status 检查（见 Q1，待确认后另立）

### 3.3 依赖与假设

- Prisma 7.10.1 已落地（`prisma7.config.ts` 已配 `migrations.path = prisma/migrations`）
- 模板阶段开发库视为可丢弃，允许从零生成初始迁移
- 本机无 Docker，真实连库验证受限；采用「静态 SQL 审查 + typecheck/lint/build」作为本期验证基线

## 4. 功能清单

| 编号 | 功能 | 优先级 | 说明 |
| --- | --- | --- | --- |
| F1 | 开发迁移命令 | P0 | `pnpm db:migrate --name <语义名>` 生成并应用迁移 |
| F2 | 部署迁移命令 | P0 | `pnpm db:deploy` 只应用未应用的迁移，幂等 |
| F3 | 迁移文件规范 | P0 | 文件入库、命名语义化、禁止手改已应用迁移 |
| F4 | seed 边界收窄 | P0 | update 只留展示字段，去掉 `isSystem`；废弃数据不自动删 |
| F5 | 文档与规范同步 | P1 | 四处文档更新，含「生产禁止 db push」硬规则 |

## 5. 详细需求

### F1 开发迁移命令

- 入口：`pnpm --filter @starter/server db:migrate -- --name <语义名>`（透传参数给 `prisma migrate dev`）
- 输入：已修改的 `schema.prisma`
- 输出：`prisma/migrations/<时间戳>_<语义名>/migration.sql`，并应用到本地库
- 分支：无 schema 变更时不生成空迁移，提示已同步；有数据丢失风险时 Prisma 会要求确认，开发者必须阅读 SQL 后决定

### F2 部署迁移命令

- 入口：`pnpm --filter @starter/server db:deploy`（`prisma migrate deploy`）
- 行为：读取已提交的迁移文件，按序应用；已应用的跳过
- 记录：Prisma 维护 `_prisma_migrations` 表记录状态
- 约束：生产/CI 只能用此命令；**生产禁止 `db push`**

### F3 迁移文件规范

- 路径：`apps/server/prisma/migrations/`，含 Prisma 生成的 `migration_lock.toml`
- 命名：Prisma 自动生成 `<时间戳>_<语义名>`，语义名用英文小写下划线，如 `20261124120000_add_user_status`
- 入库：SQL 文件必须提交，不被 `.gitignore` 排除
- 审查：迁移 SQL 是代码，PR 必须 review；已应用的迁移**禁止手改**，修正走新迁移

### F4 seed 边界收窄

- 职责：seed 只负责「初始业务数据」（默认租户、内置角色、权限点、套餐），不负责结构变更，也不负责已有数据的演进
- 改动：内置角色的 `upsert.update` 去掉 `isSystem`，只保留 `name`、`description`
- 说明：展示字段仍由 seed 覆盖，这是可接受的（它们属于初始数据）；`code`、`isSystem` 这类标识/控制字段不再被覆盖
- 废弃：权限点废弃时 seed 不自动删除，靠显式数据迁移处理

### F5 文档与规范同步

- `docs/credentials.md`：初始化步骤从 `prisma:push` 改为 `prisma migrate deploy` + `db:seed`
- `docs/conventions.md`：新增「数据库迁移」类别，写清命令、职责边界、禁止事项
- `skills/standards/nestjs/SKILL.md`：补迁移约定
- `docs/CHANGELOG.md`：记录本次变更

## 6. 验收标准

```
F1-AC1
Given 在 schema.prisma 给 User 新增一个可选字段
When  执行 pnpm db:migrate -- --name add_user_nickname
Then  prisma/migrations/ 下生成 <时间戳>_add_user_nickname/migration.sql，且内含对应 ALTER 语句

F1-AC2
Given schema 与库已同步且无新变更
When  再次执行 db:migrate
Then  不生成空迁移目录，输出已同步提示

F2-AC1
Given migrations 目录有 N 个迁移文件且目标库为空
When  执行 pnpm db:deploy
Then  按序应用全部 N 个迁移，_prisma_migrations 表有 N 条成功记录

F2-AC2
Given 迁移已全部应用
When  再次执行 db:deploy
Then  提示无待应用迁移，数据库状态不变

F3-AC1
Given 新生成一条迁移
When  执行 git status
Then  migration.sql 出现在待提交列表，未被 .gitignore 排除

F3-AC2
Given 一条已应用的迁移文件
When  检查规范文档
Then  文档明确写有「禁止手改已应用迁移，修正走新迁移」

F4-AC1
Given 内置 admin 角色的 isSystem 被运行时改为 false
When  重跑 prisma:seed
Then  isSystem 仍为 false，不被 seed 改回 true

F4-AC2
Given 内置 admin 角色的 name 被改为"超级管理员"
When  重跑 prisma:seed
Then  name 恢复为"管理员"（展示字段仍由 seed 管理）

F5-AC1
Given 查看 docs/credentials.md 初始化步骤
When  搜索 prisma:push
Then  无匹配；步骤中为 migrate deploy + seed

F5-AC2
Given 查看 conventions.md
When  查找迁移相关章节
Then  存在独立分类，含命令表、职责边界、生产禁止 db push
```

## 7. 非功能要求

- 迁移文件必须是纯 SQL，可人工 review，不依赖运行时环境
- `migrate deploy` 必须幂等，重复执行不报错、不重复应用
- 生产环境禁止 `db push` 写成文档硬规则
- 迁移 SQL 中不得出现任何连接串、密码

## 8. 埋点与度量

本期为工程规范，不涉及产品埋点。验证度量为：迁移文件数、CI 是否通过、文档更新点是否全部命中。

## 9. 待确认问题

| 编号 | 问题 | 默认假设 | 影响面 |
| --- | --- | --- | --- |
| Q1 | CI 是否有可用 PostgreSQL 实例跑 `migrate status`？ | 暂不纳入本期，另立需求 | 决定是否在 build 后加一致性检查 |
| Q2 | 现有开发库如何处理？ | 从零生成初始迁移（模板阶段数据可丢） | 若有保留数据需求，改用 `prisma db pull` 导出初始结构 |
| Q3 | 初始迁移粒度：单文件全量表 vs 按模块拆分 | 单文件 `init_permissions` | 影响可读性，不影响功能 |
