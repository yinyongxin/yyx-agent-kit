/** 当前用户在当前租户下的成员信息，由 TenantMembershipGuard 校验后挂到 request */
export interface Membership {
  tenantId: string;
  userId: string;
  role: string;
  status: string;
}

/** 角色等级：简单阶梯（对应 seed 的 admin / member；自定义角色留到 RBAC 阶段） */
export const ROLE_RANK: Record<string, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};
