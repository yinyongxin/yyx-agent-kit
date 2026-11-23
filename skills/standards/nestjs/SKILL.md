---
name: NestJS 后端规范
description: 开发 NestJS / TypeScript 后端时加载。技术栈、模块分层、Prisma、DTO 校验、异常与错误处理
---

# NestJS 后端规范

## 技术栈

- **框架**: NestJS + TypeScript
- **ORM**: Prisma
- **数据库**: PostgreSQL / MySQL
- **API**: RESTful（`@nestjs/swagger` 文档）
- **认证**: JWT + Passport

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
