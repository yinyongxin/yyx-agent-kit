import { SetMetadata } from "@nestjs/common";

export const PERMISSION_METADATA = "auth:required-permissions";

/**
 * 声明路由所需权限点（全部满足才放行）。
 *
 * 由 `TenantMembershipGuard` 读取：权限来自当前用户在当前租户下所有角色的并集；
 * `owner` / `admin` 视为拥有全部权限（membership.permissions = ["*"]）。
 *
 * 用法：`@RequirePermission(PERMISSIONS.userRead)`。
 */
export const RequirePermission = (...codes: string[]) =>
  SetMetadata(PERMISSION_METADATA, codes);
