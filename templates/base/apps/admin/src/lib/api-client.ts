import { client } from "@starter/api/generated";
import { authStore } from "./auth";

// 生成路径已含 API_PREFIX，baseUrl 留空走 Vite 代理（API_PREFIX → localhost:47100）
client.setConfig({ baseUrl: "" });

// 请求拦截：统一注入 Bearer token
client.interceptors.request.use((request) => {
  const token = authStore.getToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  return request;
});

// 响应拦截：401 清理登录态并跳登录页
client.interceptors.response.use((response) => {
  if (response.status === 401) {
    authStore.clear();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  return response;
});
