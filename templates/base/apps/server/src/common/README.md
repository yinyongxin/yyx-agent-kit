# common — 跨模块共享构件

## 职责

放**跨模块复用**且与业务无关的 Nest 构件。业务专属构件放各自 `<feature>/` 下；只有一个使用方时不要放这里。

## 目录规划（按需创建）

当前为空。引入第一个跨模块构件时，创建对应子目录并补本目录说明。

| 目录 | 放什么 |
| --- | --- |
| `decorators/` | 参数装饰器、元数据装饰器 |
| `filters/` | 全局/跨模块异常过滤器 |
| `guards/` | 认证、授权、限流等守卫 |
| `interceptors/` | 响应包装、日志、超时、缓存 |
| `middleware/` | 请求预处理（解析上下文、写 header） |
| `pipes/` | 转换/校验管道 |

## 已实现但属于领域、暂放模块内

| 构件 | 位置 | 原因 |
| --- | --- | --- |
| `TenantMiddleware` | `../auth/tenant.middleware.ts` | 租户上下文是 auth 领域职责 |
| `TenantMembershipGuard` | `../auth/tenant-membership.guard.ts` | 成员校验是 auth 领域职责 |
| `TenantTransactionInterceptor` | `../tenancy/tenant-transaction.interceptor.ts` | 租户事务是 tenancy 领域职责 |
| `@CurrentMembership` / `@MinRole` | `../auth/membership.ts` | 权限语义属于 auth |
| `@TenantTx` | `../tenancy/tenant-tx.decorator.ts` | 租户事务语义属于 tenancy |

## 关联

- 全局构件注册点：`main.ts`（`useGlobal*`）或 `app.module.ts`（`APP_*` provider）。
- 放置与注册规则见 `docs/guides/server-module-architecture.md` 第 2 节。

## 同步要求

- 引入第一个跨模块构件时，创建对应子目录（子目录也需 README），并更新本文件与 `../README.md`。
- 某构件出现第二个跨模块使用方时，才从模块内迁到这里。
