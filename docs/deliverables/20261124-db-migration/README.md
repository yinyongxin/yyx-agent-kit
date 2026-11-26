# 20261124-db-migration

## 职责

把权限系统表结构变更从 `db push` 切到 Prisma Migrate，建立迁移生成/审查/部署链路。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `01-prd.md` | F1~F5：迁移命令、文件规范、seed 边界、文档同步 |
| `02-tech-design.md` | 12 节完整技术方案与任务拆分 |
| `03-dev-log.md` | 实际改动（阶段 3 完成，未进入测试） |
| `06-record.md` | 交付记录（已归档，阶段 5 未独立执行） |

## 关联

- 规则落地在 `../../guides/conventions.md` 第 5 节与 `workspace` / `nestjs` skill。
- P3005 baseline 踩坑见 `../../guides/pitfalls.md` #20。

## 同步要求

历史交付物，不追加新内容；索引条目在 `../../README.md`「需求索引」。
