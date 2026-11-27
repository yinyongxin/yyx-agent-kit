/**
 * 客户端装配（手写文件，**不在 `src/` 内**）。
 *
 * 为什么不放 src/：接入 OpenAPI 生成后，`src/` 会被整目录重建，手写文件会被一起删掉。
 *
 * 职责收敛在本文件：
 * - `baseUrl` 固定 `/api`，开发期由 Vite 代理，生产同源部署，前端不写死后端域名。
 * - token 注入与 401 通知通过回调交给调用方，本包不认识任何 store 或路由。
 */

import { createApiClient, type ApiClientOptions } from "./src/client";

export interface ConfigureApiClientOptions {
  /** 取当前 access token；返回 null 表示未登录 */
  getToken?: () => string | null;
  /**
   * 取当前租户 id。multi 模式必填（由租户切换器写入数据源）；
   * single 模式可不填，API client 自动用 shared 的 DEFAULT_TENANT_ID。
   */
  getTenantId?: () => string | null;
  /** 收到 401 时回调：清会话并跳登录。登录接口自身不触发 */
  onUnauthorized?: () => void;
  /** 非 Web 端注入自己的请求器 */
  fetcher?: ApiClientOptions["fetcher"];
}

export const configureApiClient = (options: ConfigureApiClientOptions = {}) =>
  createApiClient({
    baseUrl: "/api",
    ...options,
  });
