# 交付等价（第一阶段：配置封装）— 开发日志

## 已确认决策（2026-11-27）

| 决策 | 结论 |
| --- | --- |
| 单租户实现深度 | **分级：先做「一套代码 + 配置封装」，schema 不动；真正裁剪放后续阶段** |
| API 路径形态 | **前端自动填 tenantId**：URL 仍是 `/t/:tenantId/...`，由 API client 注入，业务代码不感知 |

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `packages/shared/src/index.ts` | 新增 `TENANT_MODE`（`"single" \| "multi"`，CLI 生成时改写字面量）、`DEFAULT_TENANT_ID`（seed 固定租户 id）、`tenantPath(tenantId, path)` |
| `packages/api/src/client.ts` | 新增 `getTenantId` 选项；`request()` 默认自动拼租户前缀，`health` / `me` 传 `scoped=false` 不加；新增 `myTenants()` 示例方法 |
| `packages/api/src/types.ts` | 新增 `TenantSummary` |
| `packages/api/config.ts` | 手写装配入口暴露 `getTenantId` |
| `apps/server/prisma/seed.ts` | 默认租户用固定 UUID（`DEFAULT_TENANT_ID`），与前端常量对齐 |
| `cli/bin/yyx-new.mjs` | 新增 `--tenant single\|multi` 选项，生成时替换 `TENANT_MODE` 字面量 |
| `packages/shared/src/README.md` / `packages/api/src/README.md` | 补租户交付约定 |

## 使用方式

```bash
# 单租户项目：前端自动填固定租户 id，业务代码写 /users 即可
yyx-new my-shop --tenant single

# 多租户项目：业务通过 configureApiClient({ getTenantId }) 提供当前租户
yyx-new my-platform --tenant multi
```

single 模式下 `createApiClient()` 不传 `getTenantId` 也会自动注入 `DEFAULT_TENANT_ID`；multi 模式下由租户切换器把选中的租户 id 写入 `getTenantId` 的数据源。

## 验证

- `pnpm --filter @starter/server typecheck` / `pnpm --filter @starter/admin typecheck`：通过
- `pnpm lint`：通过（仅既有 Fast refresh 警告）
- CLI 实测：
  - `--tenant single` 生成的项目中 `TENANT_MODE = "single"` ✅
  - 不传 `--tenant` 生成的项目中 `TENANT_MODE = "multi"` ✅
  - 生成的 `index.ts` 中文注释与文件编码完好 ✅

## 边界与遗留

- **本阶段只解决「体验等价」**：单租户用户不再需要感知 `/t/:tenantId`，但生成项目仍带 `UserTenant` / `PlatformAdmin` 等表。真正的 schema 裁剪留到后续 feature 开关阶段。
- `04-architecture-audit.md` 的 **A1 / A2 高优先级问题仍未修**：`update` / `delete` / `findUnique` / `upsert` 不注入 tenantId、`$queryRaw` 可绕过。这是多租户地基裂缝，优先级高于裁剪。
- multi 模式下若业务忘记提供 `getTenantId`，请求会打到无前缀路径并返回 404/500；应在接入文档中强调，后续可加运行时断言。
