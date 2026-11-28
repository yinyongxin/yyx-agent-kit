import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Redis 连接封装。
 *
 * - 未配置 REDIS_URL 或连接失败时 fail-open：返回 null，由调用方降级
 * - `enableOfflineQueue: false`：Redis 不可用时命令立即失败，不堆积请求
 * - 只暴露限流需要的最小命令，避免业务直接依赖 ioredis
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;
  private warned = false;

  constructor(config: ConfigService) {
    const url = config.get<string>("redis.url");
    if (!url) {
      this.client = null;
      this.logger.warn("REDIS_URL 未配置，Redis 相关能力降级为放行");
      return;
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 1_000, 5_000),
    });
    this.client.on("error", (err) => {
      this.warn(err instanceof Error ? err.message : String(err));
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.connect();
    } catch (err) {
      this.warn(err instanceof Error ? err.message : String(err));
    }
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
  }

  get(key: string): Promise<string | null> {
    return this.run(() => this.client!.get(key));
  }

  set(key: string, value: string, ttlSeconds: number): Promise<unknown> {
    return this.run(() => this.client!.set(key, value, "EX", ttlSeconds));
  }

  del(...keys: string[]): Promise<unknown> {
    return this.run(() => this.client!.del(...keys));
  }

  incr(key: string): Promise<number | null> {
    return this.run(() => this.client!.incr(key));
  }

  expire(key: string, seconds: number): Promise<unknown> {
    return this.run(() => this.client!.expire(key, seconds));
  }

  private async run<T>(fn: () => Promise<T>): Promise<T | null> {
    if (!this.client) return null;
    try {
      return await fn();
    } catch (err) {
      this.warn(err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  private warn(message: string): void {
    if (this.warned) return;
    this.warned = true;
    this.logger.warn({ msg: "Redis 不可用，相关能力降级", error: message });
  }
}
