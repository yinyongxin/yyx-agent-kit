import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Membership } from "@/auth/membership.types";

/** 路由最低角色：@MinRole("admin") 允许 admin / owner */
export const MinRole = Reflector.createDecorator<string>();

/** 注入 guard 挂载的成员信息，业务 service 不再自己从请求里挖 tenantId */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Membership =>
    context.switchToHttp().getRequest<{ membership: Membership }>().membership,
);
