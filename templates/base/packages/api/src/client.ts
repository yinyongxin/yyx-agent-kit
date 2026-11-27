import {
  API_ROUTES,
  DEFAULT_TENANT_ID,
  TENANT_MODE,
  tenantPath,
} from "@starter/shared";
import type { HealthResponse, TenantSummary } from "./types";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  /** 默认 `/api`，走 Vite 代理；不要填后端域名 */
  baseUrl?: string;
  /** 取当前 access token，返回 null 表示未登录 */
  getToken?: () => string | null;
  /**
   * 取当前租户 id。multi 模式必填（由租户切换器写入）；
   * single 模式可不填——自动用 DEFAULT_TENANT_ID，业务代码不感知 tenantId。
   */
  getTenantId?: () => string | null;
  /** 收到 401 时回调：清会话并跳登录，由调用方实现 */
  onUnauthorized?: () => void;
  /** 自定义请求实现。小程序 / RN 端注入自己的请求器，不传则用全局 fetch */
  fetcher?: FetchLike;
}

export interface ApiClient {
  health: () => Promise<HealthResponse>;
  /** 我所属租户列表：用于渲染切换器，前端拿到后写入 getTenantId 的数据源 */
  myTenants: () => Promise<TenantSummary[]>;
}

export const createApiClient = (options: ApiClientOptions = {}): ApiClient => {
  const baseUrl = options.baseUrl ?? "/api";
  const fetcher: FetchLike = options.fetcher ?? ((input, init) => fetch(input, init));

  const request = async <T>(
    path: string,
    init?: RequestInit,
    /** health / me 等无租户上下文的接口传 false */
    scoped = true,
  ): Promise<T> => {
    const headers = new Headers(init?.headers);
    const token = options.getToken?.();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let finalPath = path;
    if (scoped) {
      const tenantId =
        options.getTenantId?.() ?? (TENANT_MODE === "single" ? DEFAULT_TENANT_ID : null);
      if (tenantId) {
        finalPath = tenantPath(tenantId, path);
      }
    }

    const response = await fetcher(`${baseUrl}${finalPath}`, { ...init, headers });

    if (response.status === 401) {
      options.onUnauthorized?.();
      throw new Error("未登录或登录已过期");
    }

    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }

    return (await response.json()) as T;
  };

  return {
    // health 是 @Public() 探活接口，不带租户前缀、也不需要 token
    health: () => request<HealthResponse>(API_ROUTES.health, undefined, false),
    // me 下的接口从 @CurrentUser() 取用户身份，不走 tenant guard，因此不加前缀
    // API_ROUTES 是 controller 片段，路径在这里拼接成完整路径
    myTenants: () =>
      request<TenantSummary[]>(
        `${API_ROUTES.me}${API_ROUTES.meTenants}`,
        undefined,
        false,
      ),
  };
};
