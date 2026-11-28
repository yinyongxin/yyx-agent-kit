import { Button } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PermissionGate } from "@/components/Permission";
import { TenantPermissionsProvider } from "@/lib/permissions";
import { TenantMembersContent } from "./TenantMembersContent";

/** 租户成员页：页面壳 + 返回租户列表 + 可复用内容 */
export const TenantMembersPage = ({ tenantId }: { tenantId: string }) => {
  const navigate = useNavigate();
  return (
    <PageShell
      title="租户成员"
      description="管理该租户的成员、角色与租户内状态"
      actions={
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate({ to: "/access/tenants" })}
        >
          返回租户
        </Button>
      }
    >
      <TenantPermissionsProvider tenantId={tenantId}>
        <PermissionGate permission="user:read">
          <TenantMembersContent tenantId={tenantId} />
        </PermissionGate>
      </TenantPermissionsProvider>
    </PageShell>
  );
};
