import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig, authConfig, databaseConfig, devConfig, filesConfig, loggingConfig, redisConfig } from "./configuration";
import { validateEnv } from "./env.validation";

/**
 * 全局配置模块：
 * - `isGlobal`：其他模块直接注入 ConfigService，不用重复 import
 * - `load`：命名空间配置（app / database / auth / dev）
 * - `validate`：启动时校验 env，缺失或格式错误直接失败
 *
 * 注意：Prisma CLI（prisma7.config.ts）、seed、scripts 不在 Nest 容器内，
 * 仍用 dotenv 读取 .env，不能注入 ConfigService。
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, authConfig, devConfig, loggingConfig, redisConfig, filesConfig],
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
