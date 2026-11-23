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

## 相关约定

- 发版手动流程与 npm 包结构见 [README.md](README.md) 的「创建新项目」「发布 CLI」章节。
- 全局偏好（pwsh、代理、mise 等）在 `~/.config/opencode/AGENTS.md`。
