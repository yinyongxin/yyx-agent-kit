# 智能体工作约定

跨需求复用的工作规则集中在这里，按类别组织。一次性环境问题见 [踩坑记录](pitfalls.md)，需求交付流程见 [产品交付流水线](../skills/flows/product-pipeline/SKILL.md)，具体工程的硬规则见各项目 `AGENTS.md`。

## 1. 信息获取与结论判定

### 1.1 一手来源优先

查技术用法时，优先查**所用库/框架的官方文档与配置字段表**，而不是上层框架的封装文档——后者往往只覆盖主流路径。典型例子：NestJS 官网的 Prisma 章节是 ESM + SQLite 语境，通篇没写 CommonJS 的 `moduleFormat` 选项，只看它就会漏配。

### 1.2 下「不可行」结论前多方交叉验证

判定「做不了 / 不支持 / 不可行」之前，按顺序做三件事：

1. 查一手文档：官方参考手册、配置字段表，不用二手转述。
2. 交叉验证一个独立来源：GitHub issue/discussion、官方示例仓库、另一份官方文档。
3. PoC 失败先排查「是不是漏配了选项」，不要把「默认配置跑不通」等同于「方案不可行」。

背景是踩坑记录 #19：只查 NestJS 二手文档 + 默认配置 PoC 报错，就误判「Prisma 7 不能按官网升级」，实际显式 `moduleFormat = "cjs"` 即可。AI 尤其容易犯这个错——一次报错看起来就是铁证。

### 1.3 用官方脚手架，不手写配置

新建项目或引入框架时，先跑官方脚手架（`create-vite` / `create-next-app` / `nest new`）拿到当前正确的模板，再往 monorepo 规范上改。经验会过时，例如 TS 7 移除了 compiler API 导致 Nest CLI 跑不了。

## 2. 技术引入与版本升级

- 引入框架/工具、升级版本前，先查官网当前最新用法与版本要求，不靠记忆。
- 显式锁版本，避免 `latest` 指向 pre-release——Prisma 的 `latest` 已指向 8.0.0-rc，必须显式装 `@7`。
- 用完一手文档后按第 1.2 节交叉验证，再下结论。

## 3. 模板与规范同步

`templates/base` 里新增或变更的技术与约定（Prisma、RBAC、OIDC、Docker、数据库选型等），必须同步反映到 `agents/` 与 `skills/standards/`。两者是一体的，不能只改模板不改规范。

## 4. 开发环境与服务

- 本地依赖服务用项目自带 `docker-compose.yml`，不用全局容器（见各项目 `AGENTS.md`）。
- 开发服务用标准后台任务启动（`pnpm dev:server` 等），需要时用一次探活确认，不要反复轮询。
- 改配置后用 `/reload`；全局 `agents/` 目录首次新建需 `opencode service restart` 一次。

## 5. 数据库迁移

结构变更走 Prisma Migrate，不再用 `db push` 直接同步。

| 场景 | 命令 |
| --- | --- |
| 改 schema 后生成迁移 | `pnpm --filter @starter/server db:migrate -- --name <语义名>` |
| 部署 / CI 应用迁移 | `pnpm --filter @starter/server db:deploy`（幂等） |
| 写初始数据 | `pnpm --filter @starter/server db:seed`（幂等 upsert） |
| 一次性原型验证 | `prisma:push`（仅限临时，禁止生产） |

边界：

- `migrate` 管表结构（DDL），`seed` 只管初始业务数据，各自独立
- 迁移 SQL 入库即代码，必须 review；已应用迁移禁止手改，修正走新迁移
- 生产禁止 `db push`；回滚写反向迁移，不靠 push 抹平
- seed 的 `update` 只覆盖展示字段，不覆盖 `code` / `isSystem` 等标识或控制字段
- 权限点 `code` 是不可变标识，变更走「新增 → 废弃 → 数据迁移」
- 新租户的角色初始化不放 seed，放租户创建业务逻辑

## 6. 前端样式与组件库

| 端 | 样式方案 |
| --- | --- |
| `apps/admin` 管理端 | Mantine 组件 + Tailwind 布局微调 |
| `apps/client` / `apps/portal` | 仅 Tailwind 原子类，不引入第三方 UI 组件库 |

- Mantine 负责交互控件（表单、表格、弹窗、通知、日期、Combobox），Tailwind 负责布局、间距、栅格，通过 `className` 传入
- 用 `tailwind-preset-mantine` 对齐主题变量与 layer 顺序，不靠 `!important` 压样式
- 只装按需包（`@mantine/core` + `@mantine/hooks`），扩展包按需加
- 组件写法统一 `export const Comp = () => {}`，不受组件库影响
- 不启用深色模式（Mantine 开箱支持，按需再开）
- 查 Mantine 最新用法优先用 `mantine` MCP（`npx -y @mantine/mcp-server`）或 `https://mantine.dev/llms.txt`——官方随版本更新，不靠记忆；管理端菜单等布局优先复用 ui.mantine.dev 的现成组件（MIT），不重复手写
- 模板项目已在 `.opencode/opencode.json` 配好 `mantine` MCP，生成的新项目自动带
- Mantine 官方 agent skills（`mantine-form` / `mantine-combobox` / `mantine-custom-components`）装在用户全局 `~/.agents/skills`，安装命令：`npx skills add https://github.com/mantinedev/skills --skill <name> -g -y`。**skills 不随项目走**，换机器 / 新环境需重装；MCP 配置随模板项目走。不要把这些第三方 skills 复制进仓库 `skills/`（官方随版本更新，复制会滞后）

## 7. 文件与目录命名规范

**总原则：延用各生态/框架的惯例，不在同一场景内混用风格。** 不追求全项目单一风格——框架绑定的命名（Next 路由、Nest 后缀）改了会坏或违背工具约定，收益低于代价。

| 场景 | 规则 | 示例 |
| --- | --- | --- |
| NestJS 后端文件 | 小写连字符 + 点分隔角色后缀 | `app.module.ts`、`jwt-auth.provider.ts`、`users.repository.ts`、`tenant-context.util.ts`、`todo.policy.ts` |
| 纯类型定义 | `<name>.types.ts` | `user.types.ts` |
| React 组件 | PascalCase，文件名 = 组件名 | `AdminLayout.tsx`、`DashboardPage.tsx` |
| CSS Modules | 与组件同名 + `.module.css` | `HeaderMenu.module.css` |
| Next.js 路由文件 | 框架保留名，**不可改** | `page.tsx`、`layout.tsx`、`route.ts` |
| TanStack Router 路由 | 小写，路由路径即文件名 | `routes/dashboard.tsx`、`routes/__root.tsx` |
| 工具生成文件 | `*.gen.ts`，**不可手改/改名** | `routeTree.gen.ts` |
| Prisma | 框架固定名 | `schema.prisma`、`models/*.prisma`、`migration.sql` |
| 配置 / 脚本 / 文档 | kebab-case 或框架固定名 | `docker-compose.yml`、`pnpm-workspace.yaml`、`init-db.sql`、`credentials.md` |
| 需求代号目录 | `YYYYMMDD-kebab-case` | `20261124-admin-mantine/` |

**新增文件时**：先看同目录已有文件的风格，跟随它；没有同目录就查上表。禁止出现小驼峰文件名（如 `usersRepository.ts`）或在 React 里用 kebab-case 组件名（如 `dashboard-page.tsx`）。现有文件若不符合，按上表改名并同步所有 import。

### admin 目录结构（TanStack Router + Mantine）

```
apps/admin/src/
├── main.tsx / index.css / routeTree.gen.ts（生成，勿改）
├── routes/                  # 文件路由：只放 createFileRoute 声明（约 5 行），指向 features 的页面组件
│   ├── __root.tsx / index.tsx / dashboard.tsx / settings.tsx
│   └── access/{users,roles,tenants,permissions}.tsx   # 目录结构=URL：/access/users
├── features/                # 按业务领域组织页面
│   ├── home/HomePage.tsx
│   ├── dashboard/DashboardPage.tsx
│   ├── access/{Users,Roles,Tenants,Permissions}Page.tsx
│   └── settings/SettingsPage.tsx
└── components/              # 通用组件 + 布局
    ├── PlaceholderPage.tsx  # 通用占位（传 title/description）
    ├── AdminLayout.tsx
    └── header/{HeaderMenu,HeaderMegaMenu}、navbar/{DoubleNavbar,NavbarNested}（两套布局保留）
```

- **routes 与页面分离**：route 文件只声明路由并指向 features 里的页面，页面实现不写在 route 里。
- **路由目录 = URL**：`routes/access/users.tsx` → `/access/users`；改路由文件路径后必须同步改导航组件里的 `to`/`link`，并**先跑一次 `pnpm --filter @starter/admin build`（或 dev）重新生成 `routeTree.gen.ts`，再跑 typecheck**（否则 typecheck 用旧 routeTree 会报错）。
- **占位页**：未实现的页面用薄组件 `<PlaceholderPage title="..." description="..." />`，不各写一套占位 UI。

## 8. 发布与文档入口

- 发版手动流程与 npm 包结构：[README.md](../README.md) 的「创建新项目」「发布 CLI」章节。
- 全局偏好（pwsh、代理、mise 等）：`~/.config/opencode/AGENTS.md`。
