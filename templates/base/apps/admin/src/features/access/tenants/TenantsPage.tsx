import { PageShell } from "@/components/PageShell";
import { PlatformAdminGate } from "@/components/Permission";
import { TenantsContent } from "./TenantsContent";

/** 租户管理 页：页面壳（PageShell）+ 可复用内容（TenantsContent）。 */
export const TenantsPage = () => (
  <PageShell title="租户管理" description="管理系统租户">
    <PlatformAdminGate>
      <TenantsContent />
    </PlatformAdminGate>
  </PageShell>
);

