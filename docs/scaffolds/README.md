# 官方脚手架参考（升级基线）

本目录保存通过 **ego 访问官网 + 官方脚手架实测**得到的最新基础项目配置，作为 `templates/base` 升级的基线参考。**不要靠记忆写配置**——升级时重新用 ego 查官网、重新跑脚手架。

## 查询时间与方法

- 时间：2026-11-24
- 方法：ego-browser 打开各官网，用官方脚手架在临时目录生成基础项目，取其 `package.json` / `tsconfig` / lint 配置

## 版本对比（查询时）

| 技术栈 | 官网/脚手架版本 | 脚手架命令 | 关键变化 |
|---|---|---|---|
| Vite | **8.3.6**（create-vite v9.3.4） | `npm create vite@latest -- --template react-ts` | Rolldown 构建；TS 7.0.2；React 19.3.1；oxlint；tsconfig references 结构（app/node）|
| NestJS | **12.0.1**（CLI 12） | `npx @nestjs/cli@latest new <name> --type cjs` | TS ^6.0.2；`module: nodenext`；rootDir `.`；oxlint+prettier；Jest 30；自带 AGENTS.md |
| Next.js | **16.4.6**（create-next-app 16.4.6） | `pnpm create next-app` | Turbopack 默认；无 postcss.config（Tailwind 走 `@tailwindcss/turbopack`）；eslint flat config；tsconfig 加 `.next/dev/types` |

## 官网链接

- Vite: https://vite.dev/guide/
- NestJS: https://docs.nestjs.com/first-steps（Node 要求 v20.19+/v22.12+；CLI 生成器 v22.22.3+/v24.15+）
- Next.js: https://nextjs.org/docs/app/getting-started/installation（Node 最低 20.9）

## 我们的适配差异（monorepo 特殊处理）

- **TS 版本前后端分开**：前端 admin/client/portal 用 TS 7（跟官方脚手架一致）；后端 server 保持 TS 6（Nest CLI 依赖 compiler API，TS 7 无此 API，见踩坑记录 #14）
- **rootDir**：server 用 `../..`（让 packages/shared 以 TS 源码直供一起编译），所以保留 `nest-cli.json` 的 `entryFile` 补丁
- **端口 47xxx / API 代理 / 依赖 @starter/shared / @starter/api / Prisma RBAC / Docker** 都是我们自己的约定，官方脚手架没有，升级时叠加回去
