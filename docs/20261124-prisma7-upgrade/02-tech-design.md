# Prisma 7 升级验证 — 技术方案（阶段 1+2 合并）

> 小需求裁剪：无新接口、无业务表变更，合并产品设计和技术方案。
> 触发原因：官网 Prisma 基线已是 7.x（driver adapter + 项目内生成 client），模板仍锁 6.5。

## 1. 需求与验收标准

**目标**：把 `templates/base` 从 Prisma 6.5 升到 Prisma 7，并按官网方案接入，保持 NestJS 12 + TS 6 + CommonJS + `moduleResolution: node` 可用。

| 编号 | 验收标准 |
| --- | --- |
| AC1 | `prisma@7` + `@prisma/client@7` 安装成功，`prisma generate` 产出 client |
| AC2 | 生成的 client 能在 `module: commonjs` + `moduleResolution: node` + TS 6 下通过 typecheck |
| AC3 | `PrismaService` 用 `@prisma/adapter-pg` + `PrismaPg` 能实例化并 `$connect()` 到 PostgreSQL |
| AC4 | 多租户 `$extends({ query: { $allModels } })` 在 Prisma 7 下行为一致（tenantId 注入仍生效） |
| AC5 | 模板整体 `pnpm build` / `pnpm lint` 通过，`GET /api/health` 返回 ok |

**非目标**：不改业务表结构、不换数据库、不把 server 切到 ESM、不改认证授权方案。

## 2. 可行性结论（PoC 已跑，2026-11-24）

PoC 目录：`D:\opencode-poc\prisma7-poc`（临时，不入库）。环境：Node 24.18 / npm 11 / Prisma 7.10.1 / TS 6.0.3。

| 项 | 结论 | 依据 |
| --- | --- | --- |
| 装 Prisma 7 并生成 client | 可做 | `prisma@7.10.1` 装成功；`npx prisma init` 生成 `prisma7.config.ts`（7.10+ 用此文件名），`generate` 成功。官网警告属实：`latest` 已指向 8.0.0-rc.35，必须显式 `@7` |
| CommonJS + TS 6 导入生成 client | 可做（按官网） | 官网 `prisma-client` generator 明确支持 CommonJS：generator 里设 `moduleFormat = "cjs"` 即生成用 `__dirname` 的 CJS client。**首轮 PoC 漏设该选项被默认推断成 ESM**，才报 `import.meta` 错；补上后 `npx tsc` + `node dist/test.js` 输出 `function`，通过 |
| driver adapter 实例化 | 可做 | `@prisma/adapter-pg` 的 `PrismaPg` + `new PrismaClient({ adapter })` 编译运行通过；真实 `$connect()` 因本机无 Docker 未能验证，留到模板环境 |
| 多租户 extension 兼容 | 可做 | PoC 复刻 `$extends({ query: { $allModels } })`，拦截 `user.findMany` 得到 `{"model":"User","operation":"findMany","injectedWhere":{"email":"a@b.com","tenantId":"tenant-123"}}`，注入行为一致 |
| 模板整体升级 | 可做 | 无阻塞项，全部「可做」，进入阶段 3 |

### 对方案的影响（完全按官网）

- **不切 ESM**：模板继续 CommonJS + TS 6 + `moduleResolution: node`（保留 `ignoreDeprecations: 6.0`，踩坑 #14）。官网明确支持 CJS，不需要改模块系统
- **按官网用 `prisma-client` generator**：`output = "../src/generated/prisma"` + `moduleFormat = "cjs"`，生成物随应用编译、排除出版本库
- **加 driver adapter**：Prisma 7 强制要求，`PrismaService` 构造改为 `super({ adapter: new PrismaPg({ connectionString }) })`
- **连接串移到 config**：新增 `prisma7.config.ts` 读 `DATABASE_URL`，schema 的 datasource 去掉 `url`
- **导入路径**：从 `@prisma/client` 改为 `../generated/prisma/client`（相对 `src/prisma`）
- **待阶段 3 验证**：真实 PG 的 `$connect()`、模板整体 `pnpm build` / `pnpm lint` / `GET /api/health`

## 3. 验证计划（PoC，已完成）

1. 临时目录建最小项目，显式装 `prisma@7`、`@prisma/client@7`、`@prisma/adapter-pg`。
2. `prisma init` 生成 schema + config，写最小 User 模型，`prisma generate`。
3. 写 `module: commonjs` + `moduleResolution: node` + TS 6 的 tsconfig，导入生成 client 并 typecheck。
4. 用 `PrismaPg` 实例化 client，验证运行时加载。
5. 复刻模板的 `$extends` 多租户 extension，验证注入行为。
6. 回填第 2 节结论 —— 全部「可做」。

## 4. 改动面（阶段 3）

- `apps/server/package.json`：`prisma`/`@prisma/client` 升 `^7.10.1`，加 `@prisma/adapter-pg`
- `apps/server/prisma/schema.prisma`：generator 改 `prisma-client` + `output` + `moduleFormat = "cjs"`，datasource 移除 `url`
- 新增 `apps/server/prisma7.config.ts`：`defineConfig` 读 `DATABASE_URL`（兼容模板 .env 在项目根）
- `apps/server/src/prisma/prisma.service.ts`：导入改 `../generated/prisma/client`，构造改 `super({ adapter })`
- `apps/server/.gitignore`（或根）：排除 `src/generated/prisma`
- 规范 skill `nestjs`、踩坑记录、CHANGELOG 同步更新
