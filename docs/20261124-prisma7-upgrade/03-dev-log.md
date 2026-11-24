# Prisma 7 升级 — 开发日志（阶段 3）

## 任务完成情况

| 编号 | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| T1 | 依赖升级 | `apps/server/package.json` | `prisma`/`@prisma/client` 升 `^7.10.1`，新增 `@prisma/adapter-pg`；scripts 去掉 `--schema` 参数 |
| T2 | schema 改官网 generator | `apps/server/prisma/schema.prisma` | `provider = "prisma-client"`、`output = "../src/generated/prisma"`、`moduleFormat = "cjs"`；datasource 移除 `url` |
| T3 | 新增 config | `apps/server/prisma7.config.ts` | `defineConfig` 读 `DATABASE_URL`，向上找项目根的 `.env`（同 `main.ts` 的 findEnv） |
| T4 | PrismaService 改 adapter | `apps/server/src/prisma/prisma.service.ts` | 导入改 `../generated/prisma/client`，构造改 `super({ adapter: new PrismaPg(...) })` |
| T5 | 排除生成物 | `.gitignore` | 新增 `apps/server/src/generated/` |
| T6 | 规范同步 | `nestjs` skill / 踩坑记录 / CHANGELOG | 版本与接入约束同步 |

## 验证结果

| 命令 | 结果 |
| --- | --- |
| `prisma generate` | 通过。Prisma Client 7.10.1 生成到 `apps/server/src/generated/prisma` |
| `pnpm build` | 通过。6 个子项目 build + 全量 typecheck，无错误 |
| `pnpm lint` | 通过（oxlint） |
| PoC 运行时加载 | 通过。`moduleFormat = "cjs"` 下 CommonJS 输出 `function` |
| 多租户 extension | 通过。`$extends` 拦截 `user.findMany`，注入 `tenantId` 生效 |
| `GET /api/health` | **未验证**：本机无 Docker/PostgreSQL（54732 端口不通）。`getHealth()` 本身不连库，但 server 启动会走 `PrismaService.onModuleInit → $connect()`，缺库无法起服务 |

## 遗留

- 真实 PG 连库与 health 冒烟需在有 Docker 的环境补做（AC3 的 `$connect()`、AC5 的 health）。
- 本机 pnpm 无 TTY 时需设 `CI=true` 与 `npm_config_store_dir`（C 盘已满），属环境问题，非代码缺陷。
