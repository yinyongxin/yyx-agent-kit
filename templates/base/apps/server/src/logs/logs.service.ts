import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  LogEntryDto,
  LogLevelStatsDto,
  LogQueryResponseDto,
} from "./dto/log-entry.dto";
import type { LogRange, QueryLogsDto } from "./dto/query-logs.dto";
import { LokiClient, type LokiStreamResult } from "./loki.client";

const RANGE_MS: Record<LogRange, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const MAX_WINDOW_MS = RANGE_MS["7d"];
/** Loki 单次返回上限（默认 max_query_length 等限制之外的保护值） */
const MAX_LOKI_LIMIT = 5000;

/** LogQL 字符串字面量转义（防注入） */
const quote = (value: string): string =>
  `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}"`;

const toNs = (date: Date): string => `${date.getTime()}000000`;

const parseJson = (line: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(line);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { message: line };
  }
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

interface ParsedEntry {
  ns: string;
  entry: LogEntryDto;
}

/**
 * 日志查询服务：把 Loki 的 streams 结果拍平成统一 LogEntry。
 *
 * 设计：
 * - 请求日志只进 Loki（不落业务库）；这里只读，不做写
 * - 分页用「多取一页」实现（Loki 无 offset），最多取 5000 条
 * - level 是 label；traceId/userId/tenantId 是 structured metadata
 */
@Injectable()
export class LogsService {
  constructor(
    private readonly loki: LokiClient,
    private readonly config: ConfigService,
  ) {}

  async query(dto: QueryLogsDto): Promise<LogQueryResponseDto> {
    const { start, end } = this.resolveWindow(dto);
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const direction = dto.direction ?? "backward";

    const limit = Math.min(page * pageSize + 1, MAX_LOKI_LIMIT);
    const streams = await this.queryLoki({
      query: this.buildQuery(dto),
      start,
      end,
      limit,
      direction,
    });

    const entries = this.flatten(streams, direction);
    const offset = (page - 1) * pageSize;
    const items = entries.slice(offset, offset + pageSize).map((item) => item.entry);
    const hasMore = entries.length > offset + pageSize;

    return {
      items,
      total: offset + items.length + (hasMore ? 1 : 0),
      page,
      pageSize,
      hasMore,
    };
  }

  /** 同一 traceId 的完整时间线（跨接口、跨服务都按时间升序） */
  async trace(traceId: string): Promise<LogEntryDto[]> {
    const end = new Date();
    const start = new Date(end.getTime() - RANGE_MS["24h"]);
    const streams = await this.queryLoki({
      query: `${this.selector()} | traceId=${quote(traceId)}`,
      start,
      end,
      limit: 1000,
      direction: "forward",
    });
    return this.flatten(streams, "forward").map((item) => item.entry);
  }

  async stats(range: LogRange = "15m"): Promise<LogLevelStatsDto> {
    const end = new Date();
    const start = new Date(end.getTime() - RANGE_MS[range]);
    const seconds = Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));
    const query = `sum by (level) (count_over_time(${this.selector()} [${seconds}s]))`;

    let rows: Array<Record<string, string>>;
    try {
      rows = await this.loki.queryInstant(query, toNs(end));
    } catch (error) {
      throw this.toHttpError(error);
    }

    const points = rows
      .map((row) => ({ level: row.level ?? "unknown", count: Number(row.value ?? 0) }))
      .filter((item) => Number.isFinite(item.count) && item.count >= 0);

    return {
      levels: points.map((item) => item.level),
      counts: points.map((item) => item.count),
      total: points.reduce((sum, item) => sum + item.count, 0),
    };
  }

  private selector(): string {
    const service = this.config.getOrThrow<string>("logging.serviceName");
    return `{service=${quote(service)}}`;
  }

  private buildQuery(dto: QueryLogsDto): string {
    const service = this.config.getOrThrow<string>("logging.serviceName");
    const labels = [`service=${quote(service)}`];
    if (dto.level) labels.push(`level=${quote(dto.level)}`);

    let query = `{${labels.join(",")}}`;
    if (dto.path) query += ` |= ${quote(dto.path)}`;
    if (dto.keyword) query += ` |= ${quote(dto.keyword)}`;

    // structured metadata 过滤：精确匹配，不做全文
    if (dto.traceId) query += ` | traceId=${quote(dto.traceId)}`;
    if (dto.userId) query += ` | userId=${quote(dto.userId)}`;
    if (dto.tenantId) query += ` | tenantId=${quote(dto.tenantId)}`;
    return query;
  }

  private resolveWindow(dto: QueryLogsDto): { start: Date; end: Date } {
    const end = dto.end ? new Date(dto.end) : new Date();
    const start = dto.start
      ? new Date(dto.start)
      : new Date(end.getTime() - RANGE_MS[dto.range ?? "15m"]);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadGatewayException("时间范围格式不正确");
    }
    if (start >= end) throw new BadGatewayException("开始时间必须早于结束时间");
    if (end.getTime() - start.getTime() > MAX_WINDOW_MS) {
      throw new BadGatewayException("查询窗口不能超过 7 天");
    }
    return { start, end };
  }

  private async queryLoki(params: {
    query: string;
    start: Date;
    end: Date;
    limit: number;
    direction: "forward" | "backward";
  }): Promise<LokiStreamResult[]> {
    if (!this.loki.enabled) {
      throw new ServiceUnavailableException("日志服务未配置（LOKI_URL 为空）");
    }
    try {
      return await this.loki.queryRange({
        query: params.query,
        startNs: toNs(params.start),
        endNs: toNs(params.end),
        limit: params.limit,
        direction: params.direction,
      });
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private toHttpError(error: unknown): Error {
    const message = error instanceof Error ? error.message : "日志服务不可用";
    if (message.includes("未配置")) return new ServiceUnavailableException(message);
    return new BadGatewayException(`日志查询失败：${message}`);
  }

  private flatten(
    streams: LokiStreamResult[],
    direction: "forward" | "backward",
  ): ParsedEntry[] {
    const result: ParsedEntry[] = [];

    for (const stream of streams) {
      for (const value of stream.values) {
        const [ns, line, metadata] = value;
        const parsed = parseJson(line);
        const req = this.asRecord(parsed.req);
        const res = this.asRecord(parsed.res);

        result.push({
          ns,
          entry: {
            timestamp: new Date(Number(BigInt(ns) / 1_000_000n)).toISOString(),
            level:
              asString(metadata?.level) ??
              asString(stream.stream.level) ??
              asString(parsed.level) ??
              "unknown",
            message: asString(parsed.msg),
            traceId: asString(metadata?.traceId) ?? asString(parsed.traceId),
            requestId:
              asString(metadata?.requestId) ??
              asString(parsed.requestId) ??
              asString(req?.id),
            userId: asString(metadata?.userId) ?? asString(parsed.userId),
            tenantId: asString(metadata?.tenantId) ?? asString(parsed.tenantId),
            method: asString(req?.method),
            path: asString(req?.url) ?? asString(parsed.path),
            statusCode: asNumber(res?.statusCode),
            responseTime: asNumber(parsed.responseTime),
            raw: parsed,
          },
        });
      }
    }

    // 纳秒字符串等长，可直接按数值语义比较
    result.sort((a, b) =>
      direction === "backward"
        ? a.ns === b.ns
          ? 0
          : a.ns < b.ns
            ? 1
            : -1
        : a.ns === b.ns
          ? 0
          : a.ns < b.ns
            ? -1
            : 1,
    );
    return result;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : undefined;
  }
}
