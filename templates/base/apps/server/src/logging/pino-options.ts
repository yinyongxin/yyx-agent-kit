import type { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import pino, { stdTimeFunctions } from "pino";
import { API_PREFIX } from "../shared";
import { RequestContext } from "./request-context";
import type { TracedRequest } from "./trace.middleware";

const DEV_PREFIX = `${API_PREFIX}/dev`;

/**
 * 构建 nestjs-pino 的 pinoHttp 配置。
 *
 * 单独放这里，让 logging.module 只做「注册」；改日志字段 / 文件轮转时不用碰模块装配。
 */
export const createPinoHttpOptions = (config: ConfigService) => {
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
    level,
    ...(stream ? { stream } : {}),
    timestamp: stdTimeFunctions.isoTime,
    // level 输出字符串（info/warn/error…），Alloy 才能直接当 label
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    autoLogging: {
      ignore: (req: {
        headers: Record<string, string | string[] | undefined>;
        url?: string;
      }) => (req.url ?? "").startsWith(DEV_PREFIX),
    },
    genReqId: (req: { headers: Record<string, string | string[] | undefined> }) => {
      const header = req.headers["x-request-id"];
      const value = Array.isArray(header) ? header[0] : header;
      return value ?? randomUUID();
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
        "req.headers['proxy-authorization']",
        "req.query.token",
        "req.query.access_token",
      ],
      censor: "***",
    },
    customLogLevel: (
      _req: unknown,
      res: { statusCode: number },
      err: Error | undefined,
    ) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customProps: (req: unknown) => {
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
  };
};
