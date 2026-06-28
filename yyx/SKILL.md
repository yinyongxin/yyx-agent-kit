---
name: yyx
description: yyx 个人开发助手，全栈开发（前端 React / TypeScript + 后端 NestJS）
---

## 通用

- **包管理**: pnpm（禁止使用 npm 或 yarn）
- **运行时**: mise 管理 (node、bun 等)，用 `mise install` / `mise use` / `mise global` 切换版本

## 通用规范

- 异常处理使用 `try/catch` + `console.error`（`catch { /* 静默忽略 */ }` 仅限第三方 SDK 非关键调用）

## 注意

- 全局偏好中已有「语言」和「临时操作」规则，skill 中不再重复
- **自动识别**：进入项目后自行判断类型，然后读取对应的子文件：
  - 前端（有 `package.json` + `tsconfig.json` 但无 `nest` 依赖）→ 读取 `frontend.md`
  - 后端（有 `nest` 依赖 / `nest-cli.json`）→ 读取 `backend.md`
  - 全栈（同时有前端和后端目录如 `client/` + `server/` 或 `apps/` 等）→ 读取 `frontend.md` + `backend.md`
