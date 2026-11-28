import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface LokiStreamResult {
  stream: Record<string, string>;
  /** Loki 3.x：values = [[纳秒时间戳, 日志行, structured metadata?], ...] */
  values: [string, string, Record<string, string>?][];
}

interface LokiQueryResponse {
  status: string;
  data?: {
    resultType: string;
    result: LokiStreamResult[];
  };
  error?: string;
}

export interface LokiQueryParams {
  query: string;
  startNs: string;
  endNs: string;
  limit: number;
  direction: "forward" | "backward";
}

const TIMEOUT_MS = 8_000;

/**
 * Loki HTTP API 客户端（只读）。
 *
 * 只封装 query_range，不引第三方 SDK：Loki API 稳定，fetch 足够。
 * 查询失败向上抛错，由 service 转成 503/502，不让日志页拖垮应用。
 */
@Injectable()
export class LokiClient {
  private readonly logger = new Logger(LokiClient.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = (config.getOrThrow<string>("logging.lokiUrl") ?? "").replace(/\/+$/, "");
  }

  get enabled(): boolean {
    return this.baseUrl.length > 0;
  }

  async queryRange(params: LokiQueryParams): Promise<LokiStreamResult[]> {
    if (!this.enabled) throw new Error("未配置 LOKI_URL");

    const url = new URL(`${this.baseUrl}/loki/api/v1/query_range`);
    url.searchParams.set("query", params.query);
    url.searchParams.set("start", params.startNs);
    url.searchParams.set("end", params.endNs);
    url.searchParams.set("limit", String(params.limit));
    url.searchParams.set("direction", params.direction);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      this.logger.warn(`Loki 请求失败：${(error as Error).message}`);
      throw new Error("日志服务不可达");
    }

    const text = await response.text();
    if (!response.ok) {
      this.logger.warn(`Loki 返回 ${response.status}：${text.slice(0, 300)}`);
      throw new Error(`日志服务返回 ${response.status}`);
    }

    let body: LokiQueryResponse;
    try {
      body = JSON.parse(text) as LokiQueryResponse;
    } catch {
      throw new Error("日志服务返回了非 JSON 响应");
    }

    if (body.status !== "success" || !body.data) {
      throw new Error(body.error ?? "日志查询失败");
    }
    return body.data.result ?? [];
  }

  /** 指标查询：按 level 统计窗口内条数 */
  async queryInstant(query: string, atNs: string): Promise<Array<Record<string, string>>> {
    if (!this.enabled) throw new Error("未配置 LOKI_URL");

    const url = new URL(`${this.baseUrl}/loki/api/v1/query`);
    url.searchParams.set("query", query);
    url.searchParams.set("time", atNs);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      this.logger.warn(`Loki 指标查询失败：${(error as Error).message}`);
      throw new Error("日志服务不可达");
    }
    if (!response.ok) throw new Error(`日志服务返回 ${response.status}`);

    const body = (await response.json()) as {
      status: string;
      data?: { result: Array<{ metric: Record<string, string>; value: [string, string] }> };
      error?: string;
    };
    if (body.status !== "success" || !body.data) {
      throw new Error(body.error ?? "日志统计失败");
    }

    // 把 metric + value 拍平成 [{ level: "info", value: "12" }]
    return body.data.result.map((item) => ({ ...item.metric, value: item.value[1] }));
  }
}
