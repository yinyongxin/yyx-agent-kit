# starter 工程约定

## 硬性规则

- 包管理只用 pnpm，禁止 npm、yarn。依赖装在根目录，子项目不生成独立锁文件。
- 本地依赖服务用项目自带的 `docker-compose.yml`（PostgreSQL + pgvector + Redis），**不要用全局 local-dev-docker-container**。每个项目一套独立容器、volume、网络，名字带项目前缀，多项目并存不冲突。
- 起环境：`cp .env.example .env` 后 `docker compose up -d`；停止保留数据 `docker compose down`；删数据 `docker compose down -v`（危险）。
- 应用连库：容器内用 service 名（`postgres` / `redis`），本地进程用 `localhost` + `.env` 里映射端口。数据库 URL 放 `.env` 的 `DATABASE_URL` / `REDIS_URL`，不硬编码。
- 向量能力用 PostgreSQL 的 pgvector 扩展（初始化 SQL 已 `CREATE EXTENSION vector`），不另起向量库；访问封装成 `VectorStore` 接口，将来要换 Qdrant 只换实现。
- 端口统一使用 **47xxx 段**，禁止用 `3000` / `5173` / `8080` 等框架默认端口，避免与本机其他项目冲突。Vite 必须开 `strictPort`，端口被占时直接失败而不是静默换端口。
- 接口调用统一走 `@starter/api`，业务代码不自己写 `fetch`、不自己拼 URL。
- 开发期接口统一用 `/api` 相对路径，由 Vite 代理到后端，**不写死后端域名**。
- 业务接口按领域命名（如 `/orders`、`/patients`），`health` 只做运维探活，不承载业务逻辑。
- 跨端共用的常量必须放 `packages/shared`：`API_PREFIX`、`API_ROUTES`、业务枚举、类型。新增接口先加常量，再由 controller 与 api 层引用，不要前后端各写一份字符串。
- 前端 HTTP 使用原生 `fetch`，不引入 axios。
- 前端样式与组件库：**管理端（`apps/admin`）允许使用 Mantine 组件库**；`apps/client`、`apps/portal` 不引入第三方 UI 组件库，样式用 Tailwind 原子类。分工见 `.opencode/skills/standards/react/SKILL.md` 的「技术栈」一节。
- 组件写法统一 `export const Comp = () => {}`，不使用 `function` 声明，不使用 `export default`。
- **先检索再开发**：新增 UI / 功能前，先看 `apps/admin/src/components`、现有 feature 与 `packages/*`；能复用就复用，不重复造轮子（表格、页面壳、用户菜单、品牌等已有底座）。
- **管理端数据表格统一用 `DataTable`，默认服务端模式**：用 `queryOptions` 让搜索/筛选/排序/分页走后端；`data` 客户端模式只用于 mock / 小数据演示。不要手写 Mantine `Table` + `Pagination`。
- 页面文件放在 `[业务名]/[业务名].tsx`，页面内组件放同级 `components/`。
- 后端 Controller 只做参数校验和转发，业务逻辑放 Service。
- 后端禁止 `res.status().json()` 手动返回错误，统一抛 `HttpException` 子类。
- 生成物（`dist/`、`*.gen.ts`）禁止手改，也不要加注释。
- 每个源码目录都要有 `README.md`：职责 / 文件索引 / 关联 / 同步要求。进入陌生目录先读它筛出要读的文件，再读具体代码；结论以代码为准，README 只用于导航。
- 文档、提交信息、回复使用简体中文。

## 验证命令（qa 判定基线）

在仓库根目录执行：

| 命令 | 含义 | 失败即判定 |
| --- | --- | --- |
| `pnpm build` | 全部子项目构建 + 全量 typecheck | 不通过 |
| `pnpm lint` | oxlint 静态检查（apps + packages） | 不通过 |
| `GET /api/health` | 后端能启动并返回 `{"status":"ok"}` | 不通过 |

单测、接口测试在第一轮需求时再引入，届时补充对应脚本。

启动全部应用用根目录 `pnpm dev`：并发起 server / client / admin / portal + Penpot MCP（`@penpot/mcp`），并自动打开 `http://localhost:47100/api/dev` 开发导航页（端口与在线状态、Swagger 入口、依赖服务、未启动服务的启动命令）。该页仅在非生产环境注册。

Windows 下也可以直接双击 `start-dev.cmd` / `stop-dev.cmd`：启动会检查 Docker、`docker compose up -d`、等 PostgreSQL 就绪后运行 `pnpm dev`；停止会结束应用进程并 `docker compose down`（保留数据卷）。

## 目录

```text
apps/client        客户端：React + Vite + TypeScript + Tailwind（端口 47173）
apps/admin         管理端：React + Vite + TypeScript + Tailwind（端口 47174）
apps/portal        门户网站：Next.js App Router + Tailwind（端口 47175，面向未登录访客）
apps/server        后端：NestJS + TypeScript（端口 47100，路由前缀 /api）
packages/shared    共享常量、工具函数、类型（TS 源码直供，无构建产物）
packages/api       接口层：类型、SDK、错误处理
docs               需求交付物，按 docs/deliverables/<slug>/ 存放
```

## 多端边界

- PC、H5、管理端、门户可以共用 `packages/shared` 与 `packages/api`。
- 小程序、App 没有标准 `fetch`，通过 `createApiClient({ fetcher })` 注入各自的请求器，不要修改请求层实现。
- 小程序、App 不共用 Web UI 组件；共享只到类型和纯逻辑这一层。
- 需要新的端时，新建 `apps/<端名>`，复用 packages，不复制代码。
- 门户（portal）是唯一以 SEO 为目标的应用：默认 server component，不滥用 `"use client"`；其他 Web 端是纯客户端渲染。
