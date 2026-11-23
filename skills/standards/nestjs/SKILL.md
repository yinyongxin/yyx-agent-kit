---
name: NestJS 后端规范
description: 开发 NestJS / TypeScript 后端时加载。技术栈、OIDC 认证与 RBAC 授权、多租户、Prisma、模块分层、DTO 校验、异常处理
---

# NestJS 后端规范

## 技术栈

- **框架**: NestJS 12 + TypeScript 6（2026-11-24 官网基线；TS 7 无 compiler API 不兼容 Nest CLI，见踩坑记录 #14）
- **ORM**: Prisma
- **数据库**: PostgreSQL + pgvector（单库兼顾关系数据与向量检索；向量访问封装成 `VectorStore` 接口，将来可换 Qdrant）
- **API**: RESTful（`@nestjs/swagger` 文档）
- **认证**: OIDC 客户端（`passport-openidconnect`）对接 Authentik；NestJS 只验 token、签本地 JWT，不做登录页
- **授权**: 业务库 RBAC（用户/角色/权限），不直接信 token 里的角色 claim

## 认证与授权分层

- **认证（你是谁）归 Authentik**：账号密码 + Google OIDC 登录、会话、MFA、用户与租户归属。微信以后加（Authentik OAuth source）
- **授权（你能干什么）归业务系统**：角色权限规则跟业务强相关，留在业务库，不被 IdP 绑死
- **单一 server 服务**：知识库、rrweb 回放等业务都是同一 NestJS server 的 module（`auth / knowledge / replay / billing`），不拆多服务；共享同一 PostgreSQL 实例（不同表/不同 database）

### OIDC 客户端流程

1. 前端跳 Authentik `/authorize`（授权码 + PKCE），登录后回调拿 `code`
2. 前端把 `code` 发给 NestJS `POST /auth/callback`，后端用 code + secret 换 token（secret 不下发浏览器）
3. 校验 token 签名 / issuer / audience / 过期 / nonce → 从 claim 取 `sub`、`tenantId`
4. 在业务库找/建用户映射 → 签**本平台短期 JWT**（含 `sub`、`tenantId`、`userId`）给前端
5. 后续业务接口用本地 JWT；全局 `AuthGuard` 注入 `req.user = { sub, tenantId, userId }`，`JwtStrategy` 校验

### 多租户与 RBAC

- **租户隔离**：`tenantId` 来自 token claim，Prisma extension 自动给所有查询注入 `where: { tenantId }`（单租户阶段用默认租户，升级不改业务代码）
- **角色权限**：`users / roles / permissions / user_roles / role_permissions` 存业务库；管理员判断**从库里查，不信 token claim**（权限变更即时生效）
- **接口守卫**：`@RequirePermissions('knowledge:read')` 做接口级校验，前端隐藏只是体验，服务端校验才是安全边界
- 小程序是补充入口：`wx.login → openid → Authentik 用户联邦 → 本地 JWT`，身份统一但登录态独立（平台限制），主干复用同一套授权逻辑

## 开发规范

- 模块按 NestJS 规范分层：`module / controller / service / dto / entity`
- 使用 Prisma Schema 定义数据模型，通过 `prisma generate` 同步类型
- Controller 只做参数校验和路由转发，业务逻辑放在 Service 层
- 使用 `class-validator` + `class-transformer` 做 DTO 校验
- 全局异常过滤器统一处理错误响应格式

## 错误处理

- **禁止在控制器中使用 `res.status().json()` 手动返回错误**，必须使用 `throw new AppHttpException()` 抛出异常
- 异常格式：`throw new AppHttpException({ message: '错误信息' }, HttpStatus.NOT_FOUND)`
- API 层使用 Nest HttpException，配合正确的 HttpStatus
- 控制器中避免抛出原始 Error，应该包装后返回有意义信息
