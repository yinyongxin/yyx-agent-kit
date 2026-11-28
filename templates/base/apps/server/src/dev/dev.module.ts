import { Module } from "@nestjs/common";
import { DevController } from "./dev.controller";
import { DevService } from "./dev.service";
import { DemoSeedService } from "./demo-seed.service";

/** 本地开发导航页；只在非生产环境由 AppModule 注册（生产访问 /starter/api/dev 直接 404） */
@Module({
  controllers: [DevController],
  providers: [DevService, DemoSeedService],
})
export class DevModule {}
