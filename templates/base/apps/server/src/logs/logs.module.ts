import { Module } from "@nestjs/common";
import { AppConfigModule } from "@/config/config.module";
import { LokiClient } from "./loki.client";
import { LogsController } from "./logs.controller";
import { LogsService } from "./logs.service";

/**
 * 日志查询模块（Loki 只读）。
 * 写入链路在 `src/logging/`；这里只负责管理端检索与 trace 时间线。
 */
@Module({
  imports: [AppConfigModule],
  controllers: [LogsController],
  providers: [LokiClient, LogsService],
})
export class LogsModule {}
