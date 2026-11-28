# 业务日志打印规范

> 请求日志、traceId、脱敏、Loki 查询由 `apps/server/src/logging/` 与 `src/logs/` 统一处理，业务代码**不要重复造轮子**。
> 本文只规定「业务代码里怎么写日志」。

## 1. 基本原则

- 一个请求的完整出入参、状态码、耗时、traceId 已由 `LoggingInterceptor` + pino 自动记录，**业务不要手写请求/响应日志**
- 业务日志统一用 Nest `Logger`，**禁止 `console.log` / `console.error`**
- 一条日志只表达一个事件，不要把整个实体/整个列表塞进去
- 密码、token、cookie、密钥、身份证/手机号等敏感信息**任何级别都不能打印**

## 2. 级别约定

| 级别 | 使用场景 | 示例 |
| --- | --- | --- |
| `error` | 需要人处理：外部依赖不可用、数据不一致、未预期异常 | 支付回调验签失败、队列消费失败 |
| `warn` | 可恢复 / 需关注：业务规则拒绝、重试、降级、慢查询 | 库存不足拒绝下单、第三方重试 |
| `info` | 关键业务事件：创建/更新/删除、登录、状态流转、任务开始/结束 | 租户创建、订单支付成功 |
| `debug` | 开发排查：分支选择、缓存命中、外部调用参数（脱敏后） | 缓存未命中回源 |
| `trace` | 极细粒度，默认关闭 | 循环内单条处理 |

约定：

- 4xx 业务拒绝用 `warn`，不要用 `error`
- 5xx / 未捕获异常由全局过滤器统一记 `error`，业务通常不用手动记
- 不要在每个数据库查询前打 `info`；慢查询由 `SLOW_SQL_MS` 自动记录

## 3. 字段约定

- `msg`：动作 + 对象，建议英文短语（如 `tenant created`、`order payment failed`），便于检索
- 业务字段用 camelCase：`tenantId`、`userId`、`orderId`、`status`、`count`、`duration`
- `traceId` / `requestId` 由 pino mixin 自动注入，**不要手动加**
- 大对象只记关键标识：`{ orderId, itemCount }`，不要整个 order
- 数组只记长度或前几个 id：`{ ids: ids.slice(0, 10), total: ids.length }`

## 4. 写法

Nest `Logger` 的第二个参数是 **context**，不是结构化字段；结构化字段放第一个参数的对象里：

```ts
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  async create(input: CreateTenantDto) {
    const tenant = await this.repo.create(input);

    // ✅ msg + 业务字段，context 固定为类名
    this.logger.log(
      { msg: "tenant created", tenantId: tenant.id, slug: tenant.slug },
      TenantsService.name,
    );

    return tenant;
  }
}
```

```ts
// ✅ 业务拒绝用 warn
this.logger.warn(
  { msg: "tenant create rejected", slug: input.slug, reason: "slug exists" },
  TenantsService.name,
);

// ❌ 不要拼接整个对象
this.logger.log(JSON.stringify(tenant));
```

## 5. 接口层

- Controller 只做参数校验与转发，**不写业务日志**；请求日志已自动记录
- 错误统一抛 `HttpException` 子类，不要 `res.status().json()`；全局过滤器会写响应体与 traceId
- 关键写操作加审计，不要用日志代替审计：

```ts
@Post()
@Audit({ action: "tenant.create", resource: "tenant" })
create(@Body() dto: CreateTenantDto) {
  return this.tenants.create(dto);
}
```

- 更新/删除需要 before 快照时，在 service 里：

```ts
const before = await this.get(id);
AuditContext.setBefore(before);
```

## 6. 禁止清单

- ❌ `console.log` / `console.error`
- ❌ 打印完整 `req` / `res` / `headers`
- ❌ 打印密码、token、authorization、cookie、密钥、验证码
- ❌ 手动生成或透传 traceId（响应头已统一）
- ❌ 在循环里逐条打 `info`（聚合后打一条）
- ❌ 用 `error` 记录 4xx 业务拒绝
- ❌ 把审计当日志：关键写操作必须落 `audit_logs`

## 7. 排查入口

| 场景 | 入口 |
| --- | --- |
| 请求级别排障 | 管理端 `/observability/logs` 或 Grafana Explore（Loki） |
| 单次请求全链路 | 响应头 `X-Trace-Id` → 日志页 traceId 时间线 / Tempo |
| 关键写操作追溯 | 管理端 `/observability/audit-logs`（before/after） |
| 慢查询 | 日志 `msg:"slow query"` / `msg:"slow transaction"` |
| 告警 | Grafana → Alerting → Alert rules |

## 8. 同步要求

- 新增敏感字段：同步 `logging/sanitize.ts` 的 `SENSITIVE_KEY`
- 新增日志查询条件：同步 `logs/dto/query-logs.dto.ts` 与 `logs.service.buildQuery`
- 新增关键写操作：加 `@Audit`，必要时设置 `AuditContext.setBefore`
