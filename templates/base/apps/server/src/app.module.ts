import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TodosController } from "./todos.controller";
import { TodosService } from "./todos.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { TenantMiddleware } from "./auth/tenant.middleware";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController, TodosController],
  providers: [AppService, TodosService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 解析 JWT 中的租户上下文，供 Prisma 自动过滤使用；不强制登录（见 AuthModule 注释）
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
