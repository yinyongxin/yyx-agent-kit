export const APP_NAME = "starter";

/**
 * API 前缀：`/<应用名>/api`。
 * 单域部署多个项目时避免 `/api` 冲突；CLI 生成项目会把 APP_NAME 换成项目名。
 */
export const API_PREFIX = `/${APP_NAME}/api`;

/** 日志查询时间范围（server DTO / admin 筛选共用） */
export const LOG_RANGES = ["5m", "15m", "1h", "6h", "24h", "7d"] as const;
export type LogRange = (typeof LOG_RANGES)[number];

/** pino 日志级别（server DTO / admin 筛选共用） */
export const LOG_LEVELS = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * 默认租户 id（seed 固定值）。
 * 系统只有多租户模型；单租户部署 = 只 seed 一个默认租户，
 * 前端在 config.ts 里 `getTenantId: () => DEFAULT_TENANT_ID` 即可。
 */
export const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

/** 拼出带租户前缀的业务路径：/t/:tenantId/... */
export const tenantPath = (tenantId: string, path: string): string =>
  `/t/${tenantId}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * 业务路由表。新增接口先在这里加常量，再由 controller 和 api 层引用，
 * 避免前后端各写一份字符串。
 *
 * 注意：`health` 是运维探活，不属于业务接口。
 */
export const API_ROUTES = {
  health: "/health",
  auth: "/auth",
  authSignIn: "/sign-in",
  me: "/me",
  meTenants: "/tenants",
  meSessions: "/sessions",
  mePassword: "/password",
  users: "/users",
  tenants: "/tenants",
  permissions: "/permissions",
  tenant: "/t/:tenantId",
  tenantMembership: "/membership",
  tenantMembers: "/members",
  tenantRoles: "/roles",
  tenantRoleOptions: "/options",
  tenantPermissions: "/permissions",
  /** 平台日志查询（Loki），平台管理员专用 */
  logs: "/logs",
  logsStats: "/logs/stats",
  /** 审计日志（PostgreSQL，append-only） */
  auditLogs: "/audit-logs",
  /** 本地开发导航页（仅开发环境注册，生产 404） */
  dev: "/dev",
  devServices: "/dev/services",
  devRateLimitProbe: "/dev/rate-limit-probe",
} as const;

/** Nest 的 @Controller / @Get 路径不带前导斜杠，用它在 controller 里引用 API_ROUTES */
export const asRoute = (path: string) => path.replace(/^\/+/, "");

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

/** 统一日期展示格式，避免各端各自拼字符串 */
export const formatDateTime = (input: Date | string | number): string => {
  const date = input instanceof Date ? input : new Date(input);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
