import { useEffect } from "react";
import { Button, Center, Loader } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PermissionGate, PlatformAdminGate } from "@/components/Permission";
import { useMe } from "@/lib/me";
import { TenantPermissionsProvider } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant";
import { TenantMembersContent } from "./TenantMembersContent";

/** 租户成员页：页面壳 + 返回入口 + 可复用内容 */
export const TenantMembersPage = ({ tenantId }: { tenantId: string }) => {
  const navigate = useNavigate();
  const { me, loading: meLoading } = useMe();
  const { setTenantId } = useTenant();

  // 让全局当前租户与正在查看的租户保持一致（导航里的角色菜单据此判断权限）
  useEffect(() => {
    setTenantId(tenantId);
  }, [tenantId, setTenantId]);

  return (
    <PageShell
      title="租户成员"
      description="管理该租户的成员、角色与租户内状态"
      actions={
        me?.isPlatformAdmin ? (
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate({ to: "/access/tenants" })}
          >
            返回租户
          </Button>
        ) : undefined
      }
    >
      {meLoading ? (
        <Center mih={200}>
          <Loader size="sm" />
        </Center>
      ) : me?.isPlatformAdmin ? (
        <PlatformAdminGate>
          <TenantMembersContent tenantId={tenantId} mode="platform" />
        </PlatformAdminGate>
      ) : (
        <TenantPermissionsProvider tenantId={tenantId}>
          <PermissionGate permission="user:read">
            <TenantMembersContent tenantId={tenantId} mode="tenant" />
          </PermissionGate>
        </TenantPermissionsProvider>
      )}
    </PageShell>
  );
};
