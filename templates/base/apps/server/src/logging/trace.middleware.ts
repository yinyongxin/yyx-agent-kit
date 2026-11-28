import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NodeRequest, NodeResponse } from "@nestjs/platform-node";
import { randomBytes } from "node:crypto";
import { RequestContext } from "./request-context";

const TRACEPARENT_RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const ZERO_TRACE = "0".repeat(32);

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
 * 为每个请求生成/透传 W3C trace 上下文：
 * - 入站 `traceparent` 合法则复用 trace-id，否则生成新的 32 位 hex
 * - 每个请求新建 span-id
 * - 响应头 `X-Trace-Id` / `traceparent` 返回给调用方（成功、失败都带）
 * - 写入 RequestContext（AsyncLocalStorage），后续日志与下游调用读取
 */
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: TracedRequest, res: NodeResponse, next: () => void) {
    const incoming = this.header(req, "traceparent");
    const matched = incoming ? incoming.match(TRACEPARENT_RE) : null;
    const traceId =
      matched && matched[2].toLowerCase() !== ZERO_TRACE
        ? matched[2].toLowerCase()
        : newTraceId();
    const spanId = newSpanId();
    const requestId =
      this.header(req, "x-request-id") ??
      (typeof req.id === "string" ? req.id : undefined) ??
      randomBytes(8).toString("hex");

    req.traceId = traceId;
    req.spanId = spanId;
    req.requestId = requestId;

    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("traceparent", `00-${traceId}-${spanId}-01`);

    const forwarded = this.header(req, "x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const userAgent = this.header(req, "user-agent");

    RequestContext.run({ traceId, spanId, requestId, ip, userAgent }, next);
  }

  private header(req: TracedRequest, name: string): string | undefined {
    const value = req.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
