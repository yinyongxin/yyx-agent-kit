import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { TenantMiddleware } from "./auth/tenant.middleware";
import { MeController } from "./auth/me.controller";
import { TenantController } from "./tenancy/tenant.controller";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController, MeController, TenantController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 从路由 /t/:tenantId 解析租户上下文，供 Prisma 自动过滤使用；不强制登录（见 AuthModule 注释）
    // Nest 12 / path-to-regexp v8：裸 `*` 已废弃，用命名通配 `{*splat}` 覆盖 /api 及其所有子路径
    consumer.apply(TenantMiddleware).forRoutes("{*splat}");
  }
}
