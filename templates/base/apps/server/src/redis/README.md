# redis — Redis 连接封装

## 职责

- 全局单例 Redis 连接（`ioredis`）
- 只暴露登录限流 / 缓存需要的最小命令：`get` / `set` / `del` / `incr` / `expire`
- Redis 未配置或不可用时 **fail-open**：返回 `null`，由调用方降级

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `redis.module.ts` | `@Global()` 模块，导出 `RedisService` |
| `redis.service.ts` | 连接生命周期与安全命令封装 |

## 注意

- `REDIS_URL` 为空时只打一次 warn，不阻塞启动
- `enableOfflineQueue: false`，避免 Redis 故障时请求堆积
- 业务不要直接 import `ioredis`；需要新命令时在 `RedisService` 增加封装
- 当前主要用于 `auth/login-throttle.service.ts` 与 `common/guards/rate-limit.guard.ts`
