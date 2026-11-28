# common/decorators

## 职责

跨模块、与业务无关的元数据/参数装饰器。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `rate-limit.decorator.ts` | `@RateLimit()` 覆盖单路由限流；`@SkipRateLimit()` 跳过全局限流 |

## 注意

- 租户/权限语义的装饰器仍在 `auth/decorators`、`tenancy/decorators`
- 这里只放没有领域语义、多个模块可能复用的装饰器
