import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NodeRequest, NodeResponse } from "@nestjs/platform-node";
import {
  context as otelContext,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace as otelTrace,
} from "@opentelemetry/api";
import { randomBytes } from "node:crypto";
import { RequestContext } from "./request-context";

const TRACEPARENT_RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const ZERO_TRACE = "0".repeat(32);
const ZERO_SPAN = "0".repeat(16);

const tracer = otelTrace.getTracer("starter-http");

export interface TracedRequest extends NodeRequest {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  tenantId?: string;
  user?: { id?: string };
  __reqBody?: unknown;
  __resBody?: unknown;
}

export const newTraceId = () => randomBytes(16).toString("hex");
export const newSpanId = () => randomBytes(8).toString("hex");

/**
 * 为每个请求建立 trace 上下文：
 * - 入站 `traceparent` 合法则复用 trace-id，否则生成新的 32 位 hex
 * - 每个请求一个 server span（OTel 启用时导出到 Tempo；未启用时是 Noop，零开销）
 * - 响应头 `X-Trace-Id` / `traceparent` 返回给调用方（成功、失败都带）
 * - 写入 RequestContext（AsyncLocalStorage），后续日志与下游调用读取
 *
 * 为什么自己建 span：Nest NodeAdapter 在请求 emit 之后异步调度，
 * OTel HTTP 插桩创建的 context 传不进 middleware（实测拿不到 active span），
 * 因此关闭入站插桩，由这里 startSpan 并用 context.with 包裹整条请求链。
 */
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: TracedRequest, res: NodeResponse, next: () => void) {
    const incoming = this.header(req, "traceparent");
    const matched = incoming ? incoming.match(TRACEPARENT_RE) : null;

    const parentContext = propagation.extract(otelContext.active(), req.headers);
    const url =
      (req as { originalUrl?: string }).originalUrl ?? req.url ?? "/";
    const span = tracer.startSpan(
      `${req.method ?? "HTTP"} ${url}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          "http.request.method": req.method ?? "",
          "url.path": url,
        },
      },
      parentContext,
    );
    const spanContext = span.spanContext();
    const hasSpan = spanContext.traceId !== ZERO_TRACE;

    const traceId = hasSpan
      ? spanContext.traceId
      : matched && matched[2].toLowerCase() !== ZERO_TRACE
        ? matched[2].toLowerCase()
        : newTraceId();
    const spanId =
      hasSpan && spanContext.spanId !== ZERO_SPAN
        ? spanContext.spanId
        : (matched?.[3] ?? newSpanId());

    const requestId =
      this.header(req, "x-request-id") ??
      (typeof req.id === "string" ? req.id : undefined) ??
      randomBytes(8).toString("hex");

    req.traceId = traceId;
    req.spanId = spanId;
    req.requestId = requestId;

    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("traceparent", `00-${traceId}-${spanId}-01`);

    // 响应结束时补状态码并关闭 span；close 兜底客户端中断
    res.once("finish", () => {
      span.setAttribute("http.response.status_code", res.statusCode);
      if (res.statusCode >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();
    });
    res.once("close", () => {
      if (!res.writableEnded) span.end();
    });

    const forwarded = this.header(req, "x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const userAgent = this.header(req, "user-agent");

    const ctx = otelTrace.setSpan(otelContext.active(), span);
    otelContext.with(ctx, () => {
      RequestContext.run({ traceId, spanId, requestId, ip, userAgent }, next);
    });
  }

  private header(req: TracedRequest, name: string): string | undefined {
    const value = req.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
