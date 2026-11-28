/** 权限点与内置角色的模板：seed 与「新建租户」共用，避免两套定义漂移 */

export const PERMISSION_TEMPLATES = [
  { code: "tenant:read", name: "查看租户" },
  { code: "tenant:write", name: "管理租户" },
  { code: "user:read", name: "查看用户" },
  { code: "user:write", name: "管理用户" },
  { code: "role:read", name: "查看角色" },
  { code: "role:write", name: "管理角色" },
  { code: "knowledge:read", name: "查看知识库" },
  { code: "knowledge:write", name: "管理知识库" },
  { code: "replay:read", name: "查看动线回放" },
  { code: "replay:write", name: "管理动线回放" },
  { code: "billing:manage", name: "管理套餐订阅" },
] as const;

export type PermissionTemplate = (typeof PERMISSION_TEMPLATES)[number];

export const ROLE_TEMPLATES = [
  {
    code: "admin",
    name: "管理员",
    description: "拥有全部权限",
    all: true,
  },
  {
    code: "member",
    name: "普通成员",
    description: "只读权限",
    all: false,
  },
] as const;

export type RoleTemplate = (typeof ROLE_TEMPLATES)[number];
