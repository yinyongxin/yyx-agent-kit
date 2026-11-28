import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuditModule } from "./audit/audit.module";
import { LoggingModule } from "./logging/logging.module";
import { LogsModule } from "./logs/logs.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AppConfigModule } from "./config/config.module";
import { AuthModule } from "./auth/auth.module";
import { TenantMiddleware } from "./auth/middleware/tenant.middleware";
import { MeController } from "./auth/me.controller";
import { TenancyModule } from "./tenancy/tenancy.module";
import { TenantsModule } from "./tenants/tenants.module";
import { UsersModule } from "./users/users.module";
import { DevModule } from "./dev/dev.module";

// 开发导航页只在非生产注册；main.ts 已先加载 .env，这里能拿到 NODE_ENV
const isProduction = process.env.NODE_ENV === "production";

@Module({
  imports: [
    LoggingModule,
    LogsModule,
    AuditModule,
    AppConfigModule,
    PrismaModule,
    AuthModule,
    TenancyModule,
    TenantsModule,
    UsersModule,
    ...(isProduction ? [] : [DevModule]),
  ],
  controllers: [AppController, MeController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 从路由 /t/:tenantId 解析租户上下文（TenantContext），供中间件/guard 使用；不强制登录（见 AuthModule 注释）
    // Nest 12 / path-to-regexp v8：裸 `*` 已废弃，用命名通配 `{*splat}` 覆盖 /api 及其所有子路径
    consumer.apply(TenantMiddleware).forRoutes("{*splat}");
  }
}
