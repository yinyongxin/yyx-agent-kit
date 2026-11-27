import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

/** 当前用户在当前租户下的成员信息，由 TenantMembershipGuard 校验后挂到 request */
export interface Membership {
  tenantId: string;
  userId: string;
  role: string;
  status: string;
}

/**
 * 角色等级（简单阶梯，对应 seed 的 admin / member）。
 * 自定义角色与继承属于后续 RBAC 阶段；届时把这里换成 policy 调用即可，装饰器接口不变。
 */
export const ROLE_RANK: Record<string, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

/** 路由最低角色：@MinRole("admin") 允许 admin / owner */
export const MinRole = Reflector.createDecorator<string>();

/** 注入 guard 加载的成员信息（业务 service 不必自己从请求里挖 tenantId） */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Membership =>
    context.switchToHttp().getRequest<{ membership: Membership }>().membership,
);
