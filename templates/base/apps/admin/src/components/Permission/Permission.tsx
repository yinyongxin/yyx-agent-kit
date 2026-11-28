import type { ReactNode } from "react";
import { Center, Loader } from "@mantine/core";
import { ForbiddenContent } from "@/components/ForbiddenContent";
import { useMe } from "@/lib/me";
import { usePermissions } from "@/lib/permissions";

/**
 * 按钮级权限：无权限时渲染 fallback（默认 null）。
 * 加载中先按无权限处理，避免先闪出按钮再消失。
 */
export const Can = ({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { loading, can } = usePermissions();
  if (loading) return <>{fallback}</>;
  return <>{can(permission) ? children : fallback}</>;
};

/**
 * 路由/页面级租户权限门禁：加载中显示 Loader，缺权限或加载失败显示 403。
 * 必须放在 TenantPermissionsProvider 内。
 */
export const PermissionGate = ({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) => {
  const { loading, error, can } = usePermissions();
  if (loading) {
    return (
      <Center mih={200}>
        <Loader size="sm" />
      </Center>
    );
  }
  if (error) return <ForbiddenContent description={error} />;
  if (!can(permission)) return <ForbiddenContent />;
  return <>{children}</>;
};

/**
 * 平台级页面门禁：依赖 /me 的 isPlatformAdmin。
 * 平台接口本身由 PlatformAdminGuard 保护，这里只负责前端展示。
 */
export const PlatformAdminGate = ({ children }: { children: ReactNode }) => {
  const { me, loading, error } = useMe();
  if (loading) {
    return (
      <Center mih={200}>
        <Loader size="sm" />
      </Center>
    );
  }
  if (error || !me) {
    return <ForbiddenContent description={error ?? "无法读取当前用户信息"} />;
  }
  if (!me.isPlatformAdmin) {
    return <ForbiddenContent description="该页面仅平台管理员可访问。" />;
  }
  return <>{children}</>;
};
