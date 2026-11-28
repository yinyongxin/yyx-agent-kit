import { SetMetadata } from "@nestjs/common";

export const PLATFORM_ADMIN_LEVEL = "auth:platform-admin-level";

export type PlatformAdminLevel = "super" | "ops";

/**
 * 平台管理员级别：不写时任意 PlatformAdmin 可用。
 * `super` 可用于敏感操作（如跨租户成员调整），`ops` 只读。
 */
export const RequirePlatformAdminLevel = (level: PlatformAdminLevel) =>
  SetMetadata(PLATFORM_ADMIN_LEVEL, level);
