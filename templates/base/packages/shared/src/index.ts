export const APP_NAME = "starter";

/** API 路径前缀。server 的 setGlobalPrefix、前端的 baseUrl、路由常量都以此为准 */
export const API_PREFIX = "/api";

/**
 * 业务路由表。新增接口先在这里加常量，再由 controller 和 api 层引用，
 * 避免前后端各写一份字符串。
 *
 * 注意：`health` 是运维探活，不属于业务接口。
 */
export const API_ROUTES = {
  health: "/health",
  todos: "/todos",
} as const;

/** 业务状态枚举，前后端共用 */
export const TODO_STATUS = {
  pending: "pending",
  done: "done",
} as const;

export type TodoStatus = (typeof TODO_STATUS)[keyof typeof TODO_STATUS];

/** 内置角色 code（与后端 seed 一致） */
export const ROLES = {
  admin: "admin",
  member: "member",
} as const;
export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

/** 权限点 code（与后端 seed 一致） */
export const PERMISSIONS = {
  tenantRead: "tenant:read",
  tenantWrite: "tenant:write",
  userRead: "user:read",
  userWrite: "user:write",
  roleRead: "role:read",
  roleWrite: "role:write",
  knowledgeRead: "knowledge:read",
  knowledgeWrite: "knowledge:write",
  replayRead: "replay:read",
  replayWrite: "replay:write",
  billingManage: "billing:manage",
} as const;
export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  createdAt: string;
}

/** 统一日期展示格式，避免各端各自拼字符串 */
export const formatDateTime = (input: Date | string | number): string => {
  const date = input instanceof Date ? input : new Date(input);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
