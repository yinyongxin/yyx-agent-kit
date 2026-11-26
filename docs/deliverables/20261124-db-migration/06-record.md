# 数据库迁移规范 交付记录

## 概览

- 状态：已交付（阶段 5 未独立执行）
- 周期：2026-11-24 ~ 2026-11-26
- 参与角色：chief（产品/技术）、coder（主会话）、archivist

## 需求背景

模板此前只有 `prisma db push`，无迁移历史、无 review、多环境易漂移、误操作不可回滚。以权限系统表为载体建立迁移规范（迁移是用户提出的第一个数据库规范问题）。

## 关键决策（ADR）

### ADR-1 从 `db push` 切到 Prisma Migrate

- 背景：权限表是多环境共享基础数据，需要可审计、可回滚的结构变更
- 选项：A 继续 push / B `db:migrate` 生成 SQL 迁移入库 + `db:deploy` 幂等部署
- 结论：选 B
- 理由：迁移文件即代码可 review、按顺序应用、多环境一致；生产禁止 `db push`
- 影响：`package.json` scripts、`prisma/migrations/`、规范第 5 节
- 状态：有效

### ADR-2 seed 只管初始数据

- 背景：seed 的 upsert 会覆盖运行时数据（如 `isSystem`）
- 选项：A 全量覆盖 / B `update` 只留展示字段
- 结论：选 B，`code` / `isSystem` 视为不可变标识
- 理由：权限点 code 是外部标识，变更走「新增 → 废弃 → 数据迁移」
- 影响：`seed.ts`、规范第 5 节
- 状态：有效

### ADR-3 portal 低内存构建适配

- 背景：全量 build 在 portal 阶段反复 OOM
- 选项：A 加大 Node 堆 / B 官网推荐的 `enablePrerenderSourceMaps: false` + `typescript.ignoreBuildErrors: true`
- 结论：选 B
- 理由：根 `pnpm build` 已含全量 typecheck，跳过 Next 内置重复检查不影响类型安全（见 `03-dev-log.md` 排查记录）
- 影响：`apps/portal/next.config.ts`
- 状态：有效

## 交付物

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| PRD / 技术方案 / 开发日志 | `01-prd.md`、`02-tech-design.md`、`03-dev-log.md` | 完整三件 |
| 初始迁移 | `templates/base/apps/server/prisma/migrations/20261124120000_init_permissions/migration.sql` | 9 表 + 枚举 + 索引 + 外键 |
| 迁移锁 | `templates/base/apps/server/prisma/migrations/migration_lock.toml` | provider = postgresql |
| 规范 | `docs/guides/conventions.md` 第 5 节、`docs/CHANGELOG.md` | 命令表与边界 |

## 验证结论

迁移 SQL 与 schema 重新生成的 diff 完全一致；seed 单独编译、server build/typecheck、`pnpm lint`、全量 `pnpm build` 均通过（详见 `03-dev-log.md`）。**未验证**：真实 `db:deploy` / `db:seed` 连库冒烟。无独立阶段 5 测试报告。

## 遗留与风险

| 项 | 影响 | 建议处理时机 |
| --- | --- | --- |
| 真实连库冒烟未做 | 迁移文件未在真实 PG 应用过 | 有 Docker 的环境补做 |
| Q1 CI `migrate status` 未纳入 | CI 无一致性检查 | 按需另立需求 |

## 下次接手

先读 `02-tech-design.md` 的 ADR 与 `templates/base/apps/server/prisma/migrations/`，确认迁移文件未被手改；有 Docker 后按 `docs/guides/conventions.md` 第 5 节跑 deploy + seed 冒烟。
