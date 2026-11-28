# audit — 审计日志

## 职责

- 记录**关键写操作**与登录事件（租户 CRUD、成员/角色变更、登录成功/失败……）
- PostgreSQL `audit_logs`，**append-only**：只插入，不更新、不删除
- 提供平台管理员查询接口 + 管理端「审计日志」页

请求级排障日志仍在 `src/logging/`（Loki，短保留）；审计是合规数据（长保留），两者不混。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `audit.module.ts` | `@Global()`：导出 `AuditService`，注册全局 `AuditInterceptor` 与 controller |
| `audit.decorator.ts` | `@Audit({ action, resource })` 声明要审计的 handler |
| `audit.interceptor.ts` | 成功后写 success（after=返回值），失败后写 failure（summary=error.message） |
| `audit.service.ts` | `record()`：自动补 traceId / ip / userAgent，失败只 warn 不影响业务 |
| `audit-context.ts` | 审计上下文门面：业务 service 用 `setBefore()` 写旧值快照 |
| `audit.repository.ts` | 平台查询：事务内 `set_config('app.audit_scope','all')` 后查全量 |
| `audit-query.service.ts` | 列表 / 详情 DTO 转换 |
| `audit.controller.ts` | `GET /api/audit-logs`、`GET /api/audit-logs/:id`（平台管理员） |
| `dto/` | 查询参数与响应结构 |

## 使用方式

Controller 方法加装饰器即可：

```ts
@Post()
@Audit({ action: "tenant.create", resource: "tenant" })
create(@Body() dto: CreateTenantDto) {
  return this.tenants.create(dto);
}
```

- `resourceId` 默认取返回值 `id`，其次路由参数 `id`
- 返回 token / 密钥的方法加 `recordResult: false`，避免把敏感值写进 `after`
- 非 HTTP handler 不处理；没有 `@Audit` 的路由完全不受影响

手动记录（登录等非标准流程）：

```ts
await this.audit.record({
  action: "auth.sign_in",
  resource: "session",
  actorLabel: email,
  result: "failure",
  summary: "密码错误",
});
```

## 数据约束

| 字段 | 说明 |
| --- | --- |
| `tenantId` | 平台级操作为 `null` |
| `actorUserId` | 匿名操作（登录失败）为 `null` |
| `actorLabel` | 登录失败时记录尝试的邮箱 |
| `action` | `模块.动词`，如 `tenant.create` |
| `result` | `success` / `failure` |
| `before` / `after` | 脱敏 + 16KB 截断后的 JSON |
| `traceId` / `ip` / `userAgent` | 来自 `RequestContext`，可与 Loki 日志串联 |

RLS（迁移 `20261128053657_audit_logs`）：

- SELECT：`tenantId = app.tenant_id` 或 `app.audit_scope = 'all'`
- INSERT：允许
- UPDATE / DELETE：无 policy → 拒绝（不可篡改）

写入用 `createMany`，避免 `INSERT ... RETURNING` 受 SELECT policy 影响。

## 注意

- 只审计关键写操作；普通查询不要加，否则表会迅速膨胀
- `before`：在 service 拿到旧实体后调用 `RequestContext.setAuditBefore(value)`，拦截器会写进 before；更新/删除都应设置
- 审计写入失败不会让业务失败，但会 `warn` 到应用日志；对强合规场景应加补偿队列
- 新增查询条件：先确认字段已写入，再扩展 `QueryAuditLogsDto` 与 `AuditRepository.buildWhere`
