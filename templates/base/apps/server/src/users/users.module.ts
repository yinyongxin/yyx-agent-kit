import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { MeController } from "./me.controller";
import { MeSessionsController } from "./me-sessions.controller";
import { MeService } from "./me.service";
import { MeSessionsService } from "./me-sessions.service";
import { UsersRepository } from "./repositories/users.repository";
import { UsersService } from "./users.service";

/**
 * 平台级用户管理 + 当前用户资源（/me）。
 * User 是全局表，走 `prisma.scoped`；租户成员关系由 tenancy 模块维护。
 */
@Module({
  controllers: [UsersController, MeController, MeSessionsController],
  providers: [UsersService, MeService, MeSessionsService, UsersRepository],
})
export class UsersModule {}
