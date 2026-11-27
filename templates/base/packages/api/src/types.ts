export interface HealthResponse {
  status: string;
}

/** 当前用户所属租户的摘要（GET /me/tenants） */
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  joinedAt: string;
}

/** 后端统一 Result 包装：业务错误也可能包在 HTTP 200 里，判定时不能只看状态码 */
export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}
