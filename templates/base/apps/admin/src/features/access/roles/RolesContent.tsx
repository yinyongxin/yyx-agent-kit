import { Alert, Text } from "@mantine/core";
import { PermissionGate } from "@/components/Permission";
import { useTenant } from "@/lib/tenant";
import { RolesTable } from "./RolesTable";

/**
 * 角色页入口：租户来自全局当前租户（导航栏切换器）。
 * 切换租户会触发全局权限 Provider 重新加载，表格用 key 重置分页/搜索。
 */
export const RolesContent = () => {
  const { tenantId, loading, error } = useTenant();

  if (error) return <Alert color="red">{error}</Alert>;
  if (loading) {
    return (
      <Text c="dimmed" size="sm">
        加载租户中…
      </Text>
    );
  }
  if (!tenantId) {
    return <Alert color="yellow">当前账号未加入任何租户</Alert>;
  }

  return (
    <PermissionGate permission="role:read">
      <RolesTable key={tenantId} tenantId={tenantId} />
    </PermissionGate>
  );
};
