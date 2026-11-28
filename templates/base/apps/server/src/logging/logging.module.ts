import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import pino, { stdTimeFunctions } from "pino";
import { AppConfigModule } from "../config/config.module";
import { LoggingInterceptor } from "./logging.interceptor";
import { AllExceptionsFilter } from "./http-exception.filter";
import { RequestContext } from "./request-context";
import { TraceMiddleware, type TracedRequest } from "./trace.middleware";

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
      useFactory: (config: ConfigService) => {
        const level = config.getOrThrow<string>("logging.level");
        const httpBody = config.getOrThrow<boolean>("logging.httpBody");
        const file = config.getOrThrow<string>("logging.file");
        const rotateFrequency = config.getOrThrow<string>("logging.fileRotateFrequency");
        const rotateSize = config.getOrThrow<string>("logging.fileRotateSize");
        const rotateKeep = config.getOrThrow<number>("logging.fileRotateKeep");

        // 开发把 JSON 同时写文件（pino-roll 按天/大小切分），供本地 Alloy 采集；
        // 生产只写 stdout 交给容器日志
        let stream: ReturnType<typeof pino.multistream> | undefined;
        if (file) {
          const fileStream = pino.transport({
            target: "pino-roll",
            options: {
              // pino-roll 会在基础名后追加日期/序号，例如 app.2026-11-28.1.log
              file: file.replace(/\.log$/i, ""),
              frequency: rotateFrequency,
              dateFormat: "yyyy-MM-dd",
              size: rotateSize,
              limit: { count: rotateKeep },
              mkdir: true,
            },
          });

          stream = pino.multistream([
            { level, stream: process.stdout },
            { level, stream: fileStream },
          ]);
        }

        return {
          pinoHttp: {
            level,
            ...(stream ? { stream } : {}),
            timestamp: stdTimeFunctions.isoTime,
            // level 输出字符串（info/warn/error…），Alloy 才能直接当 label
            formatters: {
              level: (label) => ({ level: label }),
            },
            autoLogging: {
              ignore: (req) => (req.url ?? "").startsWith("/api/dev"),
            },
            genReqId: (req) => {
              const header = req.headers["x-request-id"];
              const value = Array.isArray(header) ? header[0] : header;
              return value ?? randomUUID();
            },
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "req.query.token",
                "req.query.access_token",
              ],
              censor: "***",
            },
            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) return "error";
              if (res.statusCode >= 400) return "warn";
              return "info";
            },
            customProps: (req) => {
              const traced = req as TracedRequest;
              const props: Record<string, unknown> = {
                userId: traced.user?.id,
                tenantId: traced.tenantId,
              };
              if (httpBody) {
                props.reqBody = traced.__reqBody;
                props.resBody = traced.__resBody;
              }
              return props;
            },
            mixin: () => {
              const ctx = RequestContext.get();
              return ctx ? { traceId: ctx.traceId, requestId: ctx.requestId } : {};
            },
          },
        };
      },
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
