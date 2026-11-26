# Prisma 7 升级 交付记录

## 概览

- 状态：已交付（阶段 5 未独立执行）
- 周期：2026-11-24 ~ 2026-11-26
- 参与角色：chief（产品/技术）、coder（主会话）、archivist

## 需求背景

官网 Prisma 基线已到 7.x（driver adapter + 项目内生成 client），模板仍锁 6.5。目标是把模板升到 7 并验证 CommonJS + TS 6 下的可行性，不改业务表结构、不改认证方案。

## 关键决策（ADR）

### ADR-1 用官网 `prisma-client` generator + `moduleFormat = "cjs"`

- 背景：首轮 PoC 按默认配置生成 client，CommonJS 运行时报 `import.meta` 错，一度误判「不能按官网升级」
- 选项：A 回退 `prisma-client-js` / B 显式 `moduleFormat = "cjs"`
- 结论：选 B
- 理由：补查 Prisma 官方 Generators Reference 发现 `moduleFormat` 字段明确支持 CommonJS，漏配才是根因（见踩坑记录 #19）
- 影响：`schema.prisma` 的 generator、`prisma7.config.ts`、导入路径；后续不再凭一次 PoC 下不可行结论
- 状态：有效

### ADR-2 Prisma 7 强制 driver adapter

- 背景：7.x 不再用连接串直接构造 client
- 选项：A 沿用旧方式 / B `@prisma/adapter-pg` + `super({ adapter })`
- 结论：选 B，连接串移到 `prisma7.config.ts` 读 `DATABASE_URL`
- 理由：官网强制要求；配置与 schema 分离
- 影响：`PrismaService`、`seed.ts`（随 db-migration 需求一并补齐）
- 状态：有效

## 交付物

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| 技术方案 | `02-tech-design.md` | 阶段 1+2 合并 |
| 开发日志 | `03-dev-log.md` | 任务与验证结果 |
| 模板代码 | `templates/base/apps/server/prisma/`、`prisma7.config.ts`、`prisma.service.ts` | generator / adapter / 配置 |
| 规范 | `skills/standards/nestjs/SKILL.md`、`docs/guides/pitfalls.md`（#18）、`docs/CHANGELOG.md` | 版本与接入约束 |

## 验证结论

`prisma generate`、PoC 运行时加载、多租户 `$extends` 注入、`pnpm build`、`pnpm lint` 全部通过（详见 `03-dev-log.md`）。**未验证**：真实 PG 连库与 `GET /api/health`（本机无 Docker/PostgreSQL）。无独立阶段 5 测试报告。

## 遗留与风险

| 项 | 影响 | 建议处理时机 |
| --- | --- | --- |
| 真实 PG 连库冒烟未做 | AC3 的 `$connect()`、AC5 的 health 未验证 | 有 Docker 的环境补做 |
| 本机 pnpm 需 `CI=true` + store 指向 D 盘 | 安装/build 易 OOM（环境问题） | 换高内存环境后无需 |

## 下次接手

先读 `02-tech-design.md` 的 ADR 与 `templates/base/apps/server/prisma/schema.prisma`，确认 `moduleFormat = "cjs"` 与 adapter 仍在；连库冒烟需在有 Docker 环境做。
