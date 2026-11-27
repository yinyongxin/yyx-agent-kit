# shared

## 职责

跨应用共享的**纯逻辑**：常量、路由表、业务枚举、类型。这里是唯一来源，前后端和各个端都从这里取。

以 TS 源码被消费，没有构建产物。`package.json` 的 `exports` 是白名单，新增子路径必须同时改 `exports`。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `src/index.ts` | 包入口：`API_PREFIX`、`API_ROUTES`、`TENANT_MODE` / `DEFAULT_TENANT_ID` / `tenantPath()`、业务枚举、类型、工具函数 |
| `src/README.md` | 本文件 |

## 注意事项

- 不依赖 `react`、`fetch`、`window` 或 `process`，否则小程序 / App / 服务端无法复用。
- 新增接口时先加 `API_ROUTES` 常量，再让 controller 与 api 层引用，不要两边各写一个字符串。
- 业务枚举（状态、类型、错误码）放这里，不要在前端写字符串字面量、服务端再写一遍。
- 服务端通过相对路径引用本包源码（`../../../packages/shared/src/index`），因为 NestJS 是 CommonJS，无法直接 `require` TS 源码包。
- 租户交付：`TENANT_MODE` 由 CLI 的 `--tenant single|multi` 在生成时改写字面量；`DEFAULT_TENANT_ID` 是 seed 固定租户 id（single 模式由 API client 自动注入）；业务路径统一用 `tenantPath(tenantId, path)` 拼，不要在业务代码里手写 `/t/`。
