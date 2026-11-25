# 数据库迁移规范 — 技术方案

输入：`docs/deliverables/20261124-db-migration/01-prd.md`。目标产出：模板具备「migrate 生成 → 入库 review → deploy 应用」的完整迁移链路。

## 1. 现状

- `apps/server/prisma/` 只有 `schema.prisma` 与 `seed.ts`，**无 `migrations/` 目录**
- `apps/server/package.json` 只有 `prisma:push`（`prisma db push`）、`prisma:generate`、`prisma:seed`
- `apps/server/prisma7.config.ts` 已配 `migrations.path = "prisma/migrations"`，但未启用
- `docs/guides/credentials.md` 初始化步骤写的是 `prisma:push`
- seed 用 upsert 保证幂等；其中内置角色的 `update` 含 `isSystem`

## 2. 可行性结论

| 功能 | 可行性 | 依据 |
| --- | --- | --- |
| F1 开发迁移命令 | 可做 | `prisma migrate dev --name` 是 Prisma 7 原生能力，`prisma7.config.ts` 已配好 migrations.path |
| F2 部署迁移命令 | 可做 | `prisma migrate deploy` 原生幂等，维护 `_prisma_migrations` 表 |
| F3 迁移文件规范 | 可做 | Prisma 自动生成 `<时间戳>_<名>/migration.sql` + `migration_lock.toml`；当前 `.gitignore` 未排除该目录 |
| F4 seed 边界收窄 | 可做 | `seed.ts` 是普通 TS，删除 role 的 `update.isSystem` 即可，无依赖 |
| F5 文档同步 | 可做 | 纯文档改动，无技术风险 |

全部「可做」，无回退项。Q1/Q2/Q3 为 PRD 待确认问题，不影响本期功能可行性。

## 3. 方案概述

改 schema 后由 `migrate dev` 生成 SQL 迁移文件，文件入库经 review 后，部署环境用 `migrate deploy` 按顺序应用；seed 从"建表+建数据"的混淆角色退回到"只写初始数据"。

```mermaid
flowchart LR
    A[改 schema.prisma] --> B[pnpm db:migrate --name 语义名]
    B --> C[生成 migrations/时间戳_名/migration.sql]
    C --> D[review SQL 后提交入库]
    D --> E[CI/生产: pnpm db:deploy]
    E --> F[_prisma_migrations 记录状态]
    F --> G[pnpm db:seed 写初始数据]
```

## 4. 技术选型

| 选项 | 结论 | 理由 | 被否原因 |
| --- | --- | --- | --- |
| Prisma Migrate | 选用 | 与 Prisma 7 原生集成，config 已配，支持幂等部署 | — |
| 自写 SQL 迁移脚本 | 否 | 需自建版本表、幂等判断、顺序执行，重复造轮子 | 成本高且易错 |
| 继续 `db push` | 否 | 无历史、无 review、多环境漂移、误操作不可回滚 | 见 PRD 背景 |

## 5. 数据模型

本期不改业务表结构。迁移文件目录结构：

```text
apps/server/prisma/migrations/
├── migration_lock.toml              # Prisma 生成，provider = postgresql
└── 20261124120000_init_permissions/
    └── migration.sql                # 权限系统全部表的 CREATE 语句
```

- `migration_lock.toml` 锁定 provider，防止换库类型导致迁移错乱
- 目录名由 Prisma 生成，语义名由 `--name` 指定（小写下划线）
- 初始迁移按 Q3 默认假设采用**单文件** `init_permissions`

## 6. 接口契约

无新业务接口。命令契约：

| 命令 | 环境 | 作用 | 幂等 |
| --- | --- | --- | --- |
| `pnpm db:migrate -- --name <语义名>` | 开发 | 生成并应用迁移 | 无变更不生成空迁移 |
| `pnpm db:deploy` | 生产 / CI | 应用未应用的迁移 | 是 |
| `pnpm db:seed` | 任意 | 幂等写初始数据 | 是（upsert） |
| `pnpm db:reset` | 开发 | 清库 + 重放迁移 + seed | — |
| `pnpm db:push` | 一次性原型 | 仅临时验证，规范标注禁止用于生产 | 否 |

## 7. 模块与文件规划

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `apps/server/package.json` | 改 | scripts 新增 `db:migrate` / `db:deploy` / `db:seed` / `db:reset`；`prisma:push` 保留但加"仅原型"注释 |
| `apps/server/prisma/migrations/` | 新增 | 迁移文件入库 |
| `apps/server/prisma/seed.ts` | 改 | role 的 `update` 去掉 `isSystem`，加职责边界注释 |
| `docs/guides/credentials.md` | 改 | 初始化步骤改为 `migrate deploy` + `seed` |
| `docs/guides/conventions.md` | 改 | 新增「数据库迁移」类别 |
| `skills/standards/nestjs/SKILL.md` | 改 | 补迁移约定与禁止事项 |
| `docs/CHANGELOG.md` | 改 | 记录变更 |

## 8. 关键流程

**开发**：改 schema → `db:migrate --name xxx` → 阅读生成的 SQL → 提交入库。
**部署**：`db:deploy` → 按序应用 → 启动应用 → `db:seed`（首次或需要初始数据时）。
**异常分支**：
- 迁移中途失败：不要手改已应用迁移；修 schema 后生成新迁移，或用 `migrate resolve --rolled-back` 修正状态
- 数据丢失风险：Prisma 提示确认时，先读 SQL，必要时改为「新增列 → 数据迁移 → 删旧列」三步迁移
- 多环境结构不一致：用 `migrate status`（Q1 确认后）检测，不用 `db push` 抹平

## 9. 安全与权限

- 迁移 SQL 入库即代码，必须 review；已应用迁移禁止手改
- 生产 `migrate deploy` 使用具备 DDL 权限的最小账号
- 迁移文件与 seed 中不得出现连接串、密码；连接串只从 `DATABASE_URL` 读
- seed 不再覆盖 `isSystem` / `code`，防止运行时权限配置被初始化脚本冲掉

## 10. 兼容与迁移

- **现有开发库**：按 Q2 默认假设，从零生成初始迁移（模板阶段无真实数据）。若需保留数据，改用 `prisma db pull` 从现有库导出初始结构，再补 `migration.sql`
- **回滚**：Prisma 无内置 `migrate down`；写反向迁移 SQL，必要时用 `migrate resolve --rolled-back` 修正状态
- **seed 与迁移的边界**：结构变更走迁移；初始数据走 seed；已有数据的演进（如权限点 code 变更）走显式数据迁移，不塞进 seed

## 11. 任务拆分

| 编号 | 任务 | 涉及文件 | 依赖 | 验收方式 |
| --- | --- | --- | --- | --- |
| T1 | 改造 npm scripts | `apps/server/package.json` | — | 5 个 db:* 命令可用，`--name` 能透传 |
| T2 | 生成初始迁移 | `apps/server/prisma/migrations/` | T1 | 含权限系统全部表的 CREATE SQL，文件入库不被 gitignore |
| T3 | seed 边界收窄 | `apps/server/prisma/seed.ts` | — | role 的 update 不含 isSystem；重跑 seed 不覆盖该字段 |
| T4 | 文档与规范同步 | credentials / conventions / nestjs skill / CHANGELOG | T1,T2,T3 | 四处全部命中，生产禁止 db push 写明 |
| T5 | 静态验证 | — | T1-T4 | `prisma migrate diff` 生成 SQL 可审查；typecheck/lint/build 通过 |

## 12. 风险

| 风险 | 触发条件 | 应对 |
| --- | --- | --- |
| 无真实 DB 验证 | 本机无 Docker | 用 `prisma migrate diff --from-empty --to-schema-datamodel` 生成 SQL 静态审查；真实连库冒烟列为遗留，待有 Docker 环境补做 |
| 迁移文件与 dev 库不一致 | 开发者图快用 `db push` | 规范禁止 + 后续 Q1 的 `migrate status` 检查 |
| 已应用迁移被手改 | review 疏漏 | 规范明令禁止，PR review 重点检查 |
| seed 覆盖运行时数据 | 新增了带 update 的字段 | 评审 seed 改动时检查 update 字段是否只含展示字段 |
