import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { AppConfigModule } from "@/config/config.module";
import { LoggingInterceptor } from "./logging.interceptor";
import { AllExceptionsFilter } from "./http-exception.filter";
import { createPinoHttpOptions } from "./pino-options";
import { TraceMiddleware } from "./trace.middleware";

/**
 * 日志模块（pino + nestjs-pino）：
 * - JSON 输出（stdout），生产由 Docker/PM2/Alloy 收集
 * - 每个请求自动完成日志：req/res、状态、耗时、traceId、userId/tenantId
 * - 请求/响应体由 LoggingInterceptor 挂到 req，合并进同一条 completion log
 * - 4xx → warn，5xx/异常 → error（带堆栈，LoggerErrorInterceptor 在 main.ts 注册）
 * - 响应头统一返回 X-Trace-Id / traceparent
 *
 * 注意：LoggerModule 只在这里注册一次（@Global），业务模块不要重复 import。
 */
@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: createPinoHttpOptions(config),
      }),
    }),
  ],
  providers: [
    TraceMiddleware,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes("{*splat}");
  }
}
