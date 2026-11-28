import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NodeResponse } from "@nestjs/platform-node";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { TracedRequest } from "./trace.middleware";
import { truncateForLog } from "./sanitize";

/**
 * 把请求体 / 响应体挂到 req 上，供 pino 的 completion log（customProps）统一输出。
 * 这样每个请求只有一条完整日志，不会和 pino-http 的自动日志重复。
 *
 * 体积限制、脱敏在 sanitize/truncate 内完成；上传、SSE、开发导航页跳过。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly enabled: boolean;
  private readonly bodyLimit: number;

  constructor(config: ConfigService) {
    this.enabled = config.getOrThrow<boolean>("logging.httpBody");
    this.bodyLimit = config.getOrThrow<number>("logging.bodyLimit");
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled) return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<TracedRequest>();
    const res = http.getResponse<NodeResponse>();

    if (this.shouldSkip(req)) return next.handle();

    if (req.body !== undefined) {
      req.__reqBody = truncateForLog(req.body, this.bodyLimit);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          if (data === undefined || data === null) return;
          if (typeof (data as { pipe?: unknown }).pipe === "function") return;
          const contentType = String(res.getHeader("content-type") ?? "");
          if (contentType.includes("text/event-stream")) return;
          req.__resBody = truncateForLog(data, this.bodyLimit);
        },
      }),
    );
  }

  private shouldSkip(req: TracedRequest): boolean {
    const url = req.url ?? "";
    if (url.startsWith("/api/dev")) return true;

    const contentType = String(req.headers?.["content-type"] ?? "");
    if (contentType.includes("multipart/form-data")) return true;

    const accept = String(req.headers?.accept ?? "");
    return accept.includes("text/event-stream");
  }
}
