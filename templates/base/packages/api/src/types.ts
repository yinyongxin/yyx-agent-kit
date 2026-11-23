export interface HealthResponse {
  status: string;
}

/** 后端统一 Result 包装：业务错误也可能包在 HTTP 200 里，判定时不能只看状态码 */
export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}
