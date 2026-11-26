# 踩坑记录

这里记录在这个仓库 / 本机环境上实际遇到并解决的问题。遇到相似现象先查这里，别重复踩。

## npm 发布相关

### 1. registry 指向淘宝镜像，登录 / 发布全乱套

- **现象**：`npm login` 跳到 "Sign up to CNPM / Public registration is not allowed"；`npm view` 报 404。
- **原因**：用户级 `~/.npmrc` 里 `registry=https://registry.npmmirror.com`，还带着私有源 `npm.ainirobot.com` 的 token。
- **解决**：**项目级** `.npmrc` 写 `registry=https://registry.npmjs.org`，只覆盖本仓库，不动用户全局配置。
- **验证**：在项目目录执行 `npm config get registry` 应返回官方源。

### 2. 发布被 E403：必须 2FA 或 bypass token

- **现象**：`npm publish` 报 `E403 ... Two-factor authentication or granular access token with bypass 2fa enabled is required`。
- **原因**：账号 `tfa: false`，npm 现在强制要求。
- **临时解法**：创建 granular token，勾 **Bypass 2FA** + **Read and write**，配置到用户级 npmrc。
- **注意**：这种 token 有有效期（本次只给 7 天），且 **2027 年 1 月起失去直接发布权限**。长期方案只有 Trusted Publishing（见第 5 条）。

### 3. 新包首次发布变成 staged publishing，tarball 一度 404

- **现象**：`npm publish` 显示成功（`+ yyx-agent-kit@0.1.0`），但包页面只显示 `0.0.0-stage`（描述 "Temporary package placeholder for staged publishing"），tarball 404，`npm view` 只看到 stage 版本。
- **原因**：用 bypass token 首次发布新包时，npm 自动转成 staged release，后台异步放行。
- **解决**：**等几分钟再查**。用 registry API `https://registry.npmjs.org/<pkg>` 绕过 npm 本地缓存。
- **判断依据**：看版本的 `dist` 字段是否完整（有 shasum / integrity / fileCount 就是真发布了）；`npm pack <pkg>@<ver> --registry=...` 能下载即 OK。

### 4. pnpm dlx 拉公开包 tarball 404

- **现象**：`npm pack` 能下载，但 `pnpm dlx yyx-agent-kit --version` 报 `ERR_PNPM_FETCH_404 ... An authorization header was used`。
- **原因**：用户级 `.npmrc` 的 `//registry.npmjs.org/:_authToken` 被 pnpm 附加到了公开包请求上。
- **解决**：移除它——公开包不需要 token：
  ```powershell
  npm config delete "//registry.npmjs.org/:_authToken" --location=user
  ```
- **备注**：`npx` 不受影响；移除后手动发版需要重新配 token。

### 5. Trusted Publishing 走不通：npm 只支持 WebAuthn 安全密钥

- **现象**：配置 Trusted Publisher 提交后跳 "Confirm Password to Continue"，输完密码又跳到 2FA 启用页；选 Security key 后一直"连接其他设备" / `Device registration failed`。
- **原因**：npm 已移除认证器 App（TOTP），2FA **只支持 WebAuthn 安全密钥**——物理密钥（YubiKey 等）或 Windows Hello / Touch ID / Face ID。ego 自动化浏览器无法完成 WebAuthn 注册。
- **结论**：Trusted Publishing 的 2FA 绑定**必须在用户自己的真实浏览器里用 Windows Hello 完成**，agent 无法代劳。
- **相关 URL**：
  - 包设置页：`https://www.npmjs.com/package/<pkg>/access`（不是 `/settings`，那个是 404）
  - 2FA 设置页：`https://www.npmjs.com/settings/<user>/tfa/`（`/tfa/totp` 是 404）
- **当前决策**：放弃 Trusted Publishing（选 B）。已删除 OIDC workflow 和失败 tag `v0.1.1`。将来想启用可从 git 历史找回 workflow。

## 本地环境相关

### 6. PowerShell 5.1 读 UTF-8 无 BOM 中文脚本会解析失败

- **现象**：`powershell -File scripts/new.ps1` 报"表达式或语句中包含意外的标记 `}`"，中文字符串处报错。
- **原因**：write 工具写的是 UTF-8 **无 BOM**，5.1 用 ANSI 代码页误读。
- **解决**：脚本保存为 **UTF-8 with BOM**，或统一用 `pwsh`（已写入全局偏好）。
- **备注**：edit 工具修改带 BOM 的文件会保留 BOM；用脚本批量重写时注意别丢。

### 7. git 连不上 GitHub，但浏览器 / Invoke-WebRequest 能通

- **现象**：`git push` 报 `Failed to connect to github.com port 443` 或 `Connection was reset`。
- **原因**：系统代理 `127.0.0.1:7897`（WinINET）生效，但 git 默认不走系统代理。
- **解决**：仓库级配置（已配置在本仓库）：
  ```powershell
  git config http.proxy http://127.0.0.1:7897
  git config https.proxy http://127.0.0.1:7897
  ```
- **诊断**：
  ```powershell
  Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" | Select ProxyEnable, ProxyServer
  ```

### 8. Windows 换行符（CRLF）导致 Node CLI 多行替换失效

- **现象**：`cli/bin/yyx-new.mjs` 生成项目时，单行替换都成功，但 README 里整段"同步 agent"替换没生效。
- **原因**：模板文件是 CRLF，替换规则用 `\n` 拼接，匹配不上。
- **解决**：遍历文件时按实际换行符动态适配：
  ```js
  const nl = content.includes("\r\n") ? "\r\n" : "\n";
  const from2 = from.split("\n").join(nl);
  ```

### 9. pnpm 11 的 minimumReleaseAge

- **现象**：`pnpm dlx` 后提示 "Added 1 entry to minimumReleaseAgeExclude in pnpm-workspace.yaml"。
- **说明**：pnpm 新版本对刚发布的包有年龄限制，dlx 会自动加排除项。本次没有污染仓库（根目录无 `pnpm-workspace.yaml`），无需处理。

### 10. 项目名带连字符，PostgreSQL 初始化失败

- **现象**：CLI 生成项目名 `docker-test` 后，compose 里 `POSTGRES_DB=docker-test` / `POSTGRES_USER=docker-test`，PostgreSQL 因标识符含 `-` 初始化失败。
- **原因**：CLI 允许项目名含 `-`（`^[a-z0-9][a-z0-9-_]*$`），但 PG 的数据库名 / 用户名不能用连字符。
- **解决**：DB 名和用户名用固定值 `app`（见 `.env.example`），与项目名解耦；容器名 / 网络名 / volume 名仍带项目前缀做隔离。
- **备注**：不要把项目名直接当 DB 名用。

### 11. tsx 跑 NestJS 导致依赖注入失效

- **现象**：`tsx watch src/main.ts` 启动后，`/api/health` 报 500 —— `Cannot read properties of undefined (reading 'getHealth')`，controller 里注入的 service 是 undefined。
- **原因**：tsx 用 esbuild 转译，**不做 `emitDecoratorMetadata`**，NestJS 拿不到构造函数参数类型，无法自动注入依赖。
- **解决**：dev 用 `nest start --watch`（内部用 tsc，会 emit metadata），并补 `nest-cli.json`（sourceRoot=src、tsConfigPath）。生产用 `tsc build` + `node dist/...` 不受影响。
- **备注**：seed 用 tsx 跑没问题（不依赖 Nest DI）。

### 12. server dev 时 .env 加载时机

- **现象**：`nest start` / `node dist/...` 时 Prisma/JwtStrategy 读不到 `process.env.DATABASE_URL` / `JWT_SECRET`。
- **原因**：`.env` 在项目根目录，而 nest/node 从 `apps/server` 启动；且模块加载时就读 env。
- **解决**：`main.ts` 顶部加 `findEnv()`——从 `process.cwd()` 向上找最近的 `.env` 并用 `dotenv.config()` 加载，兼容源码/编译产物不同层级。这样 dev 和 start 都不依赖启动器的 `--env-file` 参数。

### 13. nest start 找不到入口 dist/main

- **现象**：`pnpm dev:server`（`nest start --watch`）编译成功（0 errors）但立刻退出，报 `Cannot find module ...\dist\main`。
- **原因**：tsconfig 的 `rootDir` 设为 `../..`（让 `packages/shared` 一起编译），产物实际在 `dist/apps/server/src/main.js`；`nest start` 默认找 `dist/main`。
- **解决**：`apps/server/nest-cli.json` 里显式指定 `entryFile: "apps/server/src/main"`（相对 outDir）。`nest-cli.json` 还需 `sourceRoot: "src"` + `compilerOptions.tsConfigPath: "tsconfig.json"`。
- **备注**：`node dist/apps/server/src/main.js` 直接跑不受影响；只有 `nest start` 需要 entryFile。

### 14. 编辑器报 moduleResolution=node10 弃用错误

- **现象**：编辑器报 `选项 moduleResolution=node10 已弃用，将停止在 TypeScript 7.0 中运行。指定 compilerOption "ignoreDeprecations":"6.0" 使此错误静音`，severity=Error，指向 `apps/server/tsconfig.json`。但项目本地 `tsc` 编译正常。
- **原因**：报错措辞是 **TS 6.x** 的弃用警告（TS 7 会直接说"已移除"）。编辑器用自带的 TS 6.x/7.x，把 node10 标为错误；项目本地若是 TS 5.8 则不报——同一份配置两个版本结论不同。
- **版本现实**（记牢，别再试错）：
  - TS 5.8：`ignoreDeprecations` 只认 `"5.0"`，不认 `"6.0"`
  - TS 6.x：认 `"6.0"`，node10 仍是弃用警告但可静音，且有 compiler API（Nest CLI 能用）
  - TS 7.x：**移除了 node10**（TS5108），`ignoreDeprecations` 也救不了；且 TS 7.0 不提供 programmatic compiler API → `nest start --watch` 直接跑不了（官方说 7.1 才回归）
- **不要这样修**：升 TS 7（nest 跑不了）；迁 `node16`/`bundler`（强制 import 加 `.js`，且 CJS server 不能 require ESM 的 shared 包，改动面太大）；锁 TS 5.8 + `.vscode tsdk`（编辑器仍可能用自带 TS，不生效）。
- **正解**：项目统一升到 **TS 6.0.3**（根 + server 的 devDependency 都升），tsconfig 保留 `module: commonjs` + `moduleResolution: node` + 加 `"ignoreDeprecations": "6.0"`。本地与编辑器都在 TS 6，报错消失，nest CLI 正常，产物仍是 CommonJS。
- **后续**：当前基线已改为**前端 TS 7 / 后端 TS 6**（见 `workspace` skill）。本条记录当时的决策过程，不要照此回退前端版本。
- **附带现象**：升级/重装依赖会清空生成的 Prisma client，导致 `@prisma/client did not initialize yet` 或 `has no exported member PrismaClient` —— 重新跑 `prisma generate` 即可。
- **排查大坑**：反复改 tsconfig 会让多个 `nest start --watch` 残留进程堆积，出现 EADDRINUSE、旧配置反复编译报错。修完配置后务必杀掉所有 node/nest/vite 残留进程再干净启动。

### 15. TS 6 下 Next.js 全局 CSS 副作用 import 报错

- **现象**：`import "./globals.css"` 报 TS2882 `Cannot find module or type declarations for side-effect import`。
- **原因**：TS 6 对副作用 import 做更严格的模块解析，`moduleResolution: bundler` 下 Next 15 的 `next-env.d.ts` 声明未覆盖 CSS 模块。
- **解决**：在 portal 加 `src/global.d.ts` 声明 `declare module "*.css";`。
- **后续**：项目已升到 Next.js 16.4.6（见 `workspace` skill 基线）；本条记录当时的排查过程，当前版本以基线为准。

### 16. 官方认证包 JWT_SECRET 必须 ≥32 字节 + .env 改动要重启

- **现象**：启动报 `accessToken: the key is not a valid HS256 key; HS256 needs a secret of at least 32 bytes`，或改了 `.env` 后新值不生效。
- **原因**：`@nestjs/authentication` 强制 HS256 密钥 ≥32 字节（短密钥要显式 `allowShortSecret: true`，官方文档明确不推荐）；env 在进程启动时读取，`nest start --watch` 只监听 TS 文件变化。
- **解决**：`.env.example` 里 JWT_SECRET 用 ≥32 字节默认值；改 `.env` 后手动重启服务（profile 脚本或停后台任务重启）。
- **备注**：包 0.1.x 早期版本，配置有强校验（ issuer/audience/ttl 格式、NaN 环境变量等都会启动失败）——这正是"靠官网一手资料、别靠经验"的价值。

### 17. 认证方案决策演变：Authentik → NestJS 官方包（ego 深挖官网后推翻）

- **经过**：早前因"NestJS 没有完整认证方案"选了 Authentik 做统一 IdP；用 ego 深挖 https://docs.nestjs.com/security/authentication 与 /authorization 后发现官方新包已覆盖全部能力（密码/2FA/magic link/session/access+refresh token/API key/Google OIDC + 6 类 store），且用户模型自己定义、oidc.providers 可从租户动态加载。
- **结论**：推翻 Authentik，改用 `@nestjs/authentication` + `@nestjs/authorization`。多平台共用一个 server 天然共享登录态，不需要外部 IdP。
- **教训**：方案决策前必须用 ego 查官网一手资料（认证这么核心的能力，官方可能已经有新包），不能凭"框架一般不做 X"的经验判断。

### 18. Prisma 7 升级：moduleFormat 必须显式设 cjs

- **现象**：按官网默认 `prisma-client` generator 生成 client，CommonJS 项目运行报 `SyntaxError: Cannot use 'import.meta' outside a module`。
- **原因**：Prisma 7 默认从 tsconfig 推断模块格式；模板是 CommonJS + `moduleResolution: node`，推断可能给出 ESM client，生成代码含 `import.meta.url`，CJS 下直接崩。
- **解决**：generator 里显式写 `moduleFormat = "cjs"`（官网明确支持 CommonJS），生成用 `__dirname` 的 CJS client。补上后 `tsc` + `node` 运行通过。
- **附带**：`latest` 已指向 Prisma 8 pre-release，必须显式装 `@7`；连接串移到 `prisma7.config.ts`，datasource 不再放 `url`；必须传 driver adapter（PG 用 `@prisma/adapter-pg`）。

### 19. 把「默认配置 PoC 失败」误判成「官网方案不可行」

- **现象**：Prisma 7 升级先查 NestJS 官网的 Prisma 章节（示例是 ESM + SQLite），按默认 generator 跑 PoC，CommonJS 运行时报 `import.meta` 错，于是结论是「不能按官网升级，必须回退 `prisma-client-js`」。用户追问后查 Prisma 官方 Generators Reference 与 GitHub discussion #28606，才发现官网明确支持 CommonJS——显式 `moduleFormat = "cjs"` 即可，补上后验证通过。
- **原因**：① 只查了二手来源（NestJS 官网讲 Prisma 的章节），没查一手来源（Prisma 官方 generator 文档）；二手文档是 ESM 语境，只字未提 CommonJS 的 `moduleFormat`。② PoC 只跑了默认配置，没穷尽 generator 的可选字段。③ 把「我漏配了选项」直接等同于「技术上不支持」，诊断层级错了。
- **解决**：下「不可行/不支持」结论前，必须查所用库/框架的一手文档（不是上层框架的封装文档），并交叉验证至少一个独立来源（官方参考手册的字段表、GitHub issue/discussion）；PoC 失败先问「是不是漏配了选项」再下结论。
- **教训**：这次错误差点让整个方案走偏（回退到旧 generator）。多方验证不是额外成本，而是防止「凭一次实验下结论」的必要步骤——智能体尤其容易犯这个错，因为一次 PoC 失败看起来就是铁证。

### 20. 从 db push 切到 Prisma Migrate 报 P3005（数据库非空）

- **现象**：`pnpm db:deploy` 报 `P3005 The database schema is not empty` —— 库里已有表（之前 `db push` 建的），但没有 `_prisma_migrations` 记录。
- **原因**：`db push` 只同步结构、不留迁移历史；切换到 Migrate 后，Prisma 发现库非空且无迁移记录，拒绝把初始迁移当成新库应用（怕覆盖已有数据）。
- **解决**：baseline（基线化）——把当前库状态标记为已应用初始迁移：
  ```bash
  npx prisma migrate resolve --applied <初始迁移名>   # 例：20261124120000_init_permissions
  npx prisma migrate deploy                          # 之后正常
  ```
- **备注**：baseline 只改本地库的 `_prisma_migrations` 记录，不影响代码/远端；每台用过 `db push` 的设备都要做一次。这正是"db push 仅原型验证、正式结构变更必须走 migrate"的代价——不要图省事用 push。

### 21. Prisma 7 多文件 schema：config 指向文件会静默丢模型

- **现象**：把模型拆到 `prisma/models/*.prisma` 后，`prisma generate` 成功，但生成的 client 里没有这些模型（跨文件关系也失效）。
- **原因**：`prisma.config.ts` 的 `schema` 指向了单文件 `prisma/schema.prisma`，Prisma 只读那一个文件，models/ 下全被忽略。官方博客特意强调这点；GitHub issue #28673 就是这个坑（升级 7 后多文件合并"失效"，实为配置指错）。
- **解决**：`schema: "prisma"`（指向**目录**），不是 `schema: "prisma/schema.prisma"`。Prisma 自动合并主文件 + 所有 `.prisma` 子文件，跨文件关系无需 import。
- **验证**：生成后检查 `src/generated/prisma/models.ts` 是否导出了全部模型；跑 `prisma migrate status` 确认 `Database schema is up to date`（组织变化不应产生新迁移）。
- **备注**：本次拆分前先用隔离 PoC 验证了 Prisma 7 + `prisma-client` generator 的多文件合并可行，再动项目——符合"下结论前多方验证"的约定。

### 22. TanStack Router 改路由后 typecheck 报路径不在 FileRoutesByPath

- **现象**：重组 routes 目录（如 `routes/users.tsx` → `routes/access/users.tsx`）后，`pnpm --filter @starter/admin typecheck` 报 `"/access/users" is not assignable to keyof FileRoutesByPath`，列出的还是旧路径。
- **原因**：`routeTree.gen.ts` 是由 `@tanstack/router-plugin/vite` 在 dev/build 时生成的，typecheck（纯 `tsc --noEmit`）不会触发生成，用的是旧 routeTree。
- **解决**：改路由后**先跑一次 `pnpm --filter @starter/admin build`（或 dev）**重新生成 `routeTree.gen.ts`，再跑 typecheck。`tsr` CLI 没装，只有 Vite 插件能生成。
- **备注**：同步改导航组件（`header/*`、`navbar/*`）里的 `to`/`link` 常量；ego 验证 `/access/users` 等新 URL 能打开页面。

### 23. TS 7 移除了 tsconfig 的 baseUrl

- **现象**：给 Vite 前端配 `@/*` 别名时按老经验写了 `"baseUrl": "."` + `"paths": {"@/*": ["./src/*"]}`，tsc 报 `TS5102: Option 'baseUrl' has been removed. Use '"paths": {"*": ["./*"]}' instead`。
- **原因**：TypeScript 7 移除了 `baseUrl`（paths 现在自己就能相对 tsconfig 所在目录解析），照搬 TS 5.x 的 alias 写法会报错。
- **解决**：只写 `paths`（`"@/*": ["./src/*"]`），不要 `baseUrl`。Vite 运行时另配 `resolve.alias` 指向 src（Vite 8 官方推荐双配置，不用 `resolve.tsconfigPaths`）。
- **备注**：这是"别靠记忆写配置、先查官网"的又一个例子；前端构建（Vite 的 Rolldown）不报错，只有 tsc typecheck 报，容易漏。

### 24. OpenDesign 生成流水线不可靠——直接用 MCP 文件工具做设计

- **现象**：用 OpenDesign 的 `start_run` 生成产品介绍页，连续失败：① `amr` agent 报 `AMR_INSUFFICIENT_BALANCE`（云端余额不足）；② 换 `opencode` agent（deepseek-v4.1-flash-free）后 `Agent stalled without emitting any new output for 600s`，`failure_stage: first_token_wait`，重试仍卡死；③ 再换 `opencode/hy4-flash-free` 仍卡在 `done_key` 后无输出。三次都 0 产物，累计耗时约 20 分钟。
- **原因**：OpenDesign 的 `start_run` 依赖它自己的 agent runtime（云端额度 or 本地 CLI 拉模型），本机这条链路不稳定；排队时间也曾高达 10 分钟（`queueDurationMs: 603692`）。`get_run` 长时间显示 `running` 并不代表在干活——要看事件日志，若停在 `spawn pending` / `first_token_wait` 就是真卡了。
- **解决**：**直接用 OpenDesign 的 MCP 文件工具自己写设计**，不依赖它的生成流水线：
  1. `collect_brief` → `confirm_brief`（确认需求方向，可选但有助于对齐）
  2. `create_project`（若无项目）
  3. `create_artifact(name, content)` 写入口文件（HTML/Markdown/SVG 会自动推断 artifactManifest）
  4. `write_file(path, content)` 迭代修正（如 HTML 里 `D:\projects` 要写 `D:\\projects`）
  5. `get_project` 拿 `previewUrl`，用 ego 打开截图验证
- **备注**：官方指令说"不要用 write_file 替代生成流水线（会丢设计质量）"，但那是针对"流水线可用"的前提；当流水线因额度/模型卡死不可用时，自己写是唯一可行路径，且质量可控。以后遇到 OpenDesign：`start_run` 失败一次就直接切文件工具，不要反复重试 burn 时间。
- **补充**：第一次直接写时没读 OpenDesign 的设计规范/技能参考，纯按自己审美写了双字体 + 冷色 + 卡片阴影版本，被用户指出"没用上 OpenDesign 的设计规范"才发现漏了。正确做法见 conventions 1.4：先用 `list_mcp_resources` / `read_mcp_resource` 读 `od://design-systems/<id>/DESIGN.md` 与 `od://skills/<id>/SKILL.md`。本项目按 `opencode-ai` 规范（单一等宽字体、暖调 #201d1d、蓝色 #007aff、4px 圆角、零阴影、860px 窄容器）重做后才真正用上 OpenDesign 的设计资产。

### 25. 阶段 1 跳过设计稿确认 + 术语/借鉴对象混淆 + 组件 API 凭经验写错

- **现象**：20261126-admin-table 需求出现三类过程问题：① 三件套写完直接问「进阶段 2 吗」，用户指出「不是应该先把线稿和流程图给我看和确认吗」；② 把搜索那一行叫「工具栏」，用户纠正工具栏是放「新建」等按钮的地方、应叫「筛选栏」；借鉴对象在 Mantine `DataList` / ui.mantine.dev 表格 / clinic-desk `data-list` 之间反复混淆三轮才对齐；③ `ActionBar` 写了 `visible`（实际是 `opened`）、Button 写了 `compact`（实际是 `size="compact-sm"`），typecheck 才抓到。
- **原因**：① 把「产出文档」等同于「用户确认设计」，漏了展示与确认环节；② 相近术语与相似来源没先定义清楚就动手；③ 组件 props 凭经验写，没查官网 llms.txt / MCP 的字段表。
- **解决**：阶段 1 完成后必须先展示线稿与交互稿并等确认（已写入 chief 门禁与 PRD skill 自检）；相近术语（筛选栏/工具栏）与借鉴对象先定义唯一；组件 props 查 `get_item_props` 或 llms.txt 确认；写完组件立即 typecheck。
- **教训**：qa 首轮还抓到 P1——搜索无结果时显示空白表格而非 EmptyState，因为开发自测只测了「搜索命中」路径。异常 / 空结果路径必须对称覆盖（已写入 qa-regression skill）。

### 25. Nest 12 中间件 `forRoutes("*")` 触发 LegacyRouteConverter 警告

- **现象**：启动后端日志出现 `Unsupported route path: "/api/*"... Attempting to auto-convert to "/api/{*path}"`。
- **原因**：Nest 12 使用新版 `path-to-regexp`，裸 `*` 已不是合法的通配语法；`forRoutes("*")` 叠加全局前缀 `api` 后变成 `/api/*`，被内部自动转换并打警告。官方文档「Route wildcards」用命名通配 `*splat`，并用 `{*splat}` 让通配可选，以覆盖没有后续段的路径。
- **解决**：`apps/server/src/app.module.ts` 改为 `consumer.apply(TenantMiddleware).forRoutes("{*splat}")`。
- **验证**：重启后日志中 `LegacyRouteConverter` 警告为 0；`/api/health`、`/api/todos` 仍正常映射，`GET /api/health` 返回 `ok`。
- **参考**：Nest 官网 https://docs.nestjs.com/middleware#route-wildcards （一手来源，2026-11-26 查）

## 相关约定

跨需求复用的工作规则已按类别整理到 [智能体工作约定](conventions.md)，本文只记录实际踩过的环境问题。

- 发版手动流程与 npm 包结构见 [README.md](../../README.md) 的「创建新项目」「发布 CLI」章节。
- 全局偏好（pwsh、代理、mise 等）在 `~/.config/opencode/AGENTS.md`。
