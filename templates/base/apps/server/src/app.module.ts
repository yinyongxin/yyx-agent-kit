import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { TenantMiddleware } from "./auth/middleware/tenant.middleware";
import { MeController } from "./auth/me.controller";
import { TenancyModule } from "./tenancy/tenancy.module";

@Module({
  imports: [PrismaModule, AuthModule, TenancyModule],
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
