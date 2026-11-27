export const APP_NAME = "starter";

/** API 路径前缀。server 的 setGlobalPrefix、前端的 baseUrl、路由常量都以此为准 */
export const API_PREFIX = "/api";

/**
 * 租户交付模式。CLI 生成项目时按 --tenant 改写这里的字面量：
 *   --tenant=single → 前端 API client 自动注入 DEFAULT_TENANT_ID，业务代码不感知 tenantId
 *   --tenant=multi  → 调用方通过 getTenantId 提供当前租户（租户切换器写入）
 *
 * 用联合类型声明而不是 as const，避免模板里 "multi" 与 "single" 比较被 TS 判为无交集。
 */
export const TENANT_MODE: "single" | "multi" = "multi";

/** 单租户 seed 的固定租户 id，与 seed.ts 保持一致；只用于 single 模式自动注入 */
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
  tenant: "/t/:tenantId",
  tenantMembership: "/membership",
  tenantRoles: "/roles",
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
