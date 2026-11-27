# 开发导航页 — PRD

## 背景

模板项目本地要同时跑 4 个应用（server 47100、client 47173、admin 47174、portal 47175）+ PostgreSQL / Redis / Penpot 等依赖。当前问题：

- 每个应用一个终端，不知道哪个起来了、哪个挂了
- Swagger、health、OpenAPI JSON 地址要记
- 端口被占或忘了起 docker 时，只能靠猜

## 目标

1. 一条命令启动全部应用
2. 打开一个网页就能看到：哪些程序在跑、端口、入口链接、依赖服务状态、没起来时怎么起

## 非目标

- 不做进程管理 / 一键重启（不替代终端）
- 不做日志聚合、监控告警
- 不探测远程机器或多项目
- 不返回连接串、密钥等敏感信息

## 用户故事

- 作为开发者，我执行 `pnpm dev`，浏览器自动打开导航页，一眼看到 client/admin 没起来，点命令复制去启动
- 作为开发者，我改完接口，从导航页直接点 Swagger / OpenAPI JSON
- 作为开发者，我忘了数据库有没有起，导航页显示 PostgreSQL 离线并给出 `docker compose up -d postgres`

## 验收标准

| 编号 | 验收点 |
| --- | --- |
| AC1 | `pnpm dev` 同时启动 server / client / admin / portal，server 就绪后自动打开导航页 |
| AC2 | `GET /api/dev` 返回 HTML 页面，未登录可访问 |
| AC3 | `GET /api/dev/services` 返回应用与依赖服务的状态、端口、链接、启动命令 |
| AC4 | 页面每 5 秒自动刷新，可手动刷新；离线服务显示启动命令且可点击复制 |
| AC5 | 端口从配置推导（client=server+73 等），`--port-base` 生成的项目也正确 |
| AC6 | 生产环境（`NODE_ENV=production`）访问 `/api/dev` 返回 404 |
| AC7 | 导航页路由不出现在 OpenAPI 契约（`openapi.json`）里 |
| AC8 | 探测不阻塞页面：各探测 1.2s 超时，并发执行 |
