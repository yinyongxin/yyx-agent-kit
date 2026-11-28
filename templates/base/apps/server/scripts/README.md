# scripts — 后端脚本

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `dev.mjs` | 开发模式编排：`tsc -w` + `tsc-alias -w` + `node --watch`；`pnpm dev:server` 调用 |
| `check-schema.mjs` | 校验 Prisma 模型字段约定（`schema:check`，已并入根 `build`） |
| `export-openapi.ts` | 导出 OpenAPI JSON（`swagger:export`，供前端生成客户端） |

## 为什么 dev 不用 nest start

server 用 `@/` 路径别名，`tsc` 编译后不会重写；`tsc-alias` 负责把 `dist` 里的 `@/...` 改成相对路径。
`nest start --watch` 不会跑 `tsc-alias`，运行时会出现 `Cannot find module '@/...'`。
因此 `dev.mjs` 自己编排三个进程：编译、重写别名、`node --watch` 重启。

## 注意

- 修改 `tsconfig.json` 的 `paths` 后，同步 `tsc-alias`（构建脚本已带 `-p tsconfig.json`）
- 生产/验收统一用 `pnpm build` + `node dist/apps/server/src/main.js`，不要在 dev watch 运行期间跑 e2e（文件变化会触发重启）
