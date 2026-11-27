# scripts — 一次性/构建期脚本

## 职责

放不进入运行时的脚本（导出契约、数据修复等）。不在这里写业务逻辑。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `export-openapi.ts` | 离线导出 `packages/api/openapi.json`（从 dist 加载 AppModule，避免 tsx 丢失 decorator metadata） |

## 关联

- 由根脚本 `api:generate` 调用（先 build server 再导出）。
- 产出被 `packages/api/openapi-ts.config.ts` 消费。

## 同步要求

- 脚本依赖 `dist` 时，必须在入口检查产物是否存在并给出明确报错。
- 新增脚本同步本文件与 `../README.md` 的目录说明。
