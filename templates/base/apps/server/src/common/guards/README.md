# common/guards

## 职责

跨模块 Guard。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `rate-limit.guard.ts` | 全站 API 限流（IP + Controller.method 固定窗口，Redis） |

## 注意

- 通过 `APP_GUARD` 全局注册（`app.module.ts`）
- 健康检查使用 `@SkipRateLimit()`；单路由可用 `@RateLimit()` 覆盖阈值
- Redis 不可用时 fail-open；代理部署需配置 `TRUST_PROXY`
