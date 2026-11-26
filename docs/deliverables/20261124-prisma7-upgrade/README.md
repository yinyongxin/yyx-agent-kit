# 20261124-prisma7-upgrade

## 职责

Prisma 7 升级验证，阶段 1+2 合并推进，确认 CommonJS 兼容与多文件 schema。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `02-tech-design.md` | 标题为「技术方案（阶段 1+2 合并）」，含需求、验收与可行性 PoC |
| `03-dev-log.md` | 实际改动（阶段 3 完成，未测试） |
| `05-record.md` | 交付记录（已归档，阶段 4 未独立执行） |

## 关联

- `moduleFormat = "cjs"` 与多文件 schema 的坑分别见 `../../guides/pitfalls.md` #18、#21。
- 规则落地在 `skills/standards/nestjs/SKILL.md`；索引条目在 `../../README.md`「需求索引」。

## 同步要求

历史交付物，不追加新内容。
