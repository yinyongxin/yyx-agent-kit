import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { RedisService } from "../redis/redis.service";

const KEY_PREFIX = "auth:login";

/**
 * 登录失败锁定。
 *
 * 两个维度：
 * - 邮箱 + IP：窗口内失败达到 `loginMaxAttempts` 后锁定 `loginLockSeconds`
 * - IP：更高的阈值 `loginIpMaxAttempts`，防止换邮箱批量撞库；成功登录不清零
 *
 * Redis 不可用时 fail-open（不阻塞登录），由 RedisService 统一降级。
 */
@Injectable()
export class LoginThrottleService {
  private readonly maxAttempts: number;
  private readonly windowSeconds: number;
  private readonly lockSeconds: number;
  private readonly ipMaxAttempts: number;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.maxAttempts = config.getOrThrow<number>("auth.loginMaxAttempts");
    this.windowSeconds = config.getOrThrow<number>("auth.loginWindowSeconds");
    this.lockSeconds = config.getOrThrow<number>("auth.loginLockSeconds");
    this.ipMaxAttempts = config.getOrThrow<number>("auth.loginIpMaxAttempts");
  }

  async assertAllowed(email: string, ip: string): Promise<void> {
    const emailKey = this.emailKey(email, ip);
    const ipKey = this.ipKey(ip);

    const [emailLock, ipLock] = await Promise.all([
      this.redis.get(`${KEY_PREFIX}:lock:${emailKey}`),
      this.redis.get(`${KEY_PREFIX}:lock:${ipKey}`),
    ]);
    if (emailLock || ipLock) throw this.tooMany();

    const [emailFails, ipFails] = await Promise.all([
      this.redis.get(`${KEY_PREFIX}:fail:${emailKey}`),
      this.redis.get(`${KEY_PREFIX}:fail:${ipKey}`),
    ]);
    if (
      Number(emailFails ?? 0) >= this.maxAttempts ||
      Number(ipFails ?? 0) >= this.ipMaxAttempts
    ) {
      throw this.tooMany();
    }
  }

  async recordFailure(email: string, ip: string): Promise<void> {
    const emailKey = this.emailKey(email, ip);
    const ipKey = this.ipKey(ip);
    await this.bump(emailKey, this.maxAttempts);
    await this.bump(ipKey, this.ipMaxAttempts);
  }

  /** 成功登录只清「邮箱 + IP」维度；IP 维度保留，避免被交替成功绕过 */
  async recordSuccess(email: string, ip: string): Promise<void> {
    const key = this.emailKey(email, ip);
    await this.redis.del(
      `${KEY_PREFIX}:fail:${key}`,
      `${KEY_PREFIX}:lock:${key}`,
    );
  }

  private async bump(key: string, limit: number): Promise<void> {
    const count = await this.redis.incr(`${KEY_PREFIX}:fail:${key}`);
    if (count === null) return;

    if (count === 1) {
      await this.redis.expire(`${KEY_PREFIX}:fail:${key}`, this.windowSeconds);
    }
    if (count >= limit) {
      await this.redis.set(
        `${KEY_PREFIX}:lock:${key}`,
        "1",
        this.lockSeconds,
      );
    }
  }

  private emailKey(email: string, ip: string): string {
    return createHash("sha256")
      .update(`${email.trim().toLowerCase()}|${ip || "unknown"}`)
      .digest("hex")
      .slice(0, 32);
  }

  private ipKey(ip: string): string {
    return createHash("sha256")
      .update(ip || "unknown")
      .digest("hex")
      .slice(0, 32);
  }

  private tooMany(): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "登录失败次数过多，请稍后再试",
        error: "Too Many Requests",
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
