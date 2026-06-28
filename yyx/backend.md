# 后端开发

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
