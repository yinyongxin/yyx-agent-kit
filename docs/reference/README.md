# reference — 一手参考资料

## 职责

放**查资料用**的原始基线，保持官方原样、不混入我们自己的设计结论。当前只有官方脚手架配置。

## 文件索引

| 路径 | 作用 |
| --- | --- |
| `scaffolds/README.md` | Vite / NestJS / Next.js 的官网实测版本、命令与 monorepo 适配差异 |
| `scaffolds/vite/`、`scaffolds/nest/`、`scaffolds/next/` | 对应脚手架原样配置文件，供升级时逐项对照 |

## 关联

- 被 `../../skills/standards/workspace/SKILL.md` 的「技术栈版本基线」引用。
- 升级框架时先用 ego 查官网 + 跑官方脚手架，把新基线写进这里，再同步 workspace skill。
- `scaffolds/nest/`、`scaffolds/next/`、`scaffolds/vite/` 是官方原样配置目录，**不添加 README**，由本文件统一说明。

## 同步要求

新增或更新参考资料时，同步本文件、`../README.md` 的文档地图，以及引用它的 skill 条款；原始配置不要手改，重新从官方脚手架生成。
