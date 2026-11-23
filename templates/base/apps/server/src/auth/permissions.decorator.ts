import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "required_permissions";

/** 接口级权限要求。配合 PermissionsGuard 使用。 */
export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
