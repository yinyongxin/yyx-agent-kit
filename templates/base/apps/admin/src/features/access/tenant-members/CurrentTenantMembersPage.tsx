import { Alert, Center, Loader } from "@mantine/core";
import { PageShell } from "@/components/PageShell";
import { useTenant } from "@/lib/tenant";
import { TenantMembersPage } from "./TenantMembersPage";

/** 当前租户成员页：路由不带 tenantId，跟随全局租户切换器 */
export const CurrentTenantMembersPage = () => {
  const { tenantId, loading, error } = useTenant();

  if (loading) {
    return (
      <PageShell title="租户成员" description="管理当前租户的成员与角色">
        <Center mih={200}>
          <Loader size="sm" />
        </Center>
      </PageShell>
    );
  }

  if (!tenantId) {
    return (
      <PageShell title="租户成员" description="管理当前租户的成员与角色">
        <Alert color="yellow">
          {error ?? "当前账号没有可用租户，请先联系平台管理员加入租户。"}
        </Alert>
      </PageShell>
    );
  }

  return <TenantMembersPage tenantId={tenantId} />;
};
