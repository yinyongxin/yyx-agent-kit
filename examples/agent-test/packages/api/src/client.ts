import { API_ROUTES, type Todo } from "@agent-test/shared";
import type { HealthResponse } from "./types";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  /** 默认 `/api`，走 Vite 代理；不要填后端域名 */
  baseUrl?: string;
  /** 取当前 access token，返回 null 表示未登录 */
  getToken?: () => string | null;
  /** 收到 401 时回调：清会话并跳登录，由调用方实现 */
  onUnauthorized?: () => void;
  /** 自定义请求实现。小程序 / RN 端注入自己的请求器，不传则用全局 fetch */
  fetcher?: FetchLike;
}

export interface ApiClient {
  health: () => Promise<HealthResponse>;
  todos: () => Promise<Todo[]>;
}

export const createApiClient = (options: ApiClientOptions = {}): ApiClient => {
  const baseUrl = options.baseUrl ?? "/api";
  const fetcher: FetchLike = options.fetcher ?? ((input, init) => fetch(input, init));

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    const token = options.getToken?.();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetcher(`${baseUrl}${path}`, { ...init, headers });

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
    health: () => request<HealthResponse>(API_ROUTES.health),
    todos: () => request<Todo[]>(API_ROUTES.todos),
  };
};
