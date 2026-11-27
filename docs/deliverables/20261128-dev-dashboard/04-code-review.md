# 开发导航页 — 代码审查

## 范围

`apps/server/src/dev/*`、`apps/server/src/config/configuration.ts`、`apps/server/src/app.module.ts`、`apps/server/src/main.ts`、`packages/shared/src/index.ts`、`scripts/open-dev.mjs`、根 `package.json`。

## 检查项

| 维度 | 结论 |
| --- | --- |
| 生产隔离 | `DevModule` 仅非生产 import；controller 再断言 `app.nodeEnv`，双保险；生产实测 404 |
| 契约污染 | `@ApiExcludeController()`，导出 `openapi.json` 中无 dev 路由（实测 0 条） |
| 敏感信息 | 只返回端口、URL、在线状态、启动命令；无连接串/密码；端口来自配置而非探测系统 |
| 认证 | 两个路由 `@Public()`，符合「未登录也能看」的需求；无写接口 |
| 性能 | 探测并发执行，单项 1.2s 超时；页面 5 秒轮询，请求量可忽略；`SELECT 1` 不触业务表 |
| 资源释放 | HTTP 用 `AbortController` 清理定时器；TCP socket 结束即 `destroy` |
| 失败处理 | 探测失败归一为 offline，不抛错；`/api/dev/services` 异常转为 503 |
| 配置规范 | 端口/主机全部走 `ConfigService` 的 `dev` 命名空间，模块内无 `process.env` |
| 端口可移植 | 由 server 端口推导 +73/+74/+75，兼容 `--port-base` |
| 命名与风格 | 与现有模块一致（module/controller/service/README，`export const`）；接口与类重名已修 |
| 依赖控制 | 只新增 `concurrently`（根 devDependency）；浏览器打开用平台命令，未引入 `open` / `wait-on` |
| 前端安全 | 页面用 `textContent` 渲染数据，不拼 `innerHTML`；无外部脚本/CDN |

## 结论

通过。无阻断问题；遗留可选项：若将来接入 `@nestjs/terminus` 或 K8s 探针，可把 `DevService` 的探测逻辑复用到标准健康检查，页面层不变。
