import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/** 全局 Redis 连接（登录限流 / 共享缓存）；未配置时相关能力 fail-open */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
