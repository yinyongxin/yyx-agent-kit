import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NodeResponse } from "@nestjs/platform-node";
import { RequestContext } from "./request-context";
import type { TracedRequest } from "./trace.middleware";
import { truncateForLog } from "./sanitize";

/**
 * 全局异常响应：统一带上 traceId，供用户报障时直接提供。
 * 500 不向客户端暴露内部异常信息（具体堆栈在 pino 日志里）。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly bodyLimit: number;

  constructor(config: ConfigService) {
    this.bodyLimit = config.getOrThrow<number>("logging.bodyLimit");
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<TracedRequest>();
    const res = http.getResponse<NodeResponse>();

    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const response = exception instanceof HttpException ? exception.getResponse() : null;

    let body: Record<string, unknown>;
    if (typeof response === "string") {
      body = { statusCode: status, message: response };
    } else if (response && typeof response === "object") {
      body = { ...(response as Record<string, unknown>) };
    } else {
      body = {
        statusCode: status,
        message: status >= 500 ? "Internal server error" : "Request failed",
      };
    }
    body.statusCode = status;

    const traceId = RequestContext.get()?.traceId ?? req.traceId;
    if (traceId) body.traceId = traceId;

    req.__resBody = truncateForLog(body, this.bodyLimit);
    if (!res.headersSent) res.status(status).json(body);
  }
}
