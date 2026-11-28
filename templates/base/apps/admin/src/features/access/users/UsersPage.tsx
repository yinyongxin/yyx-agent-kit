import { PageShell } from "@/components/PageShell";
import { PlatformAdminGate } from "@/components/Permission";
import { UsersContent } from "./UsersContent";

/** 用户管理页：页面壳（PageShell）+ 可复用内容（UsersContent）。 */
export const UsersPage = () => (
  <PageShell title="用户管理" description="管理系统用户">
    <PlatformAdminGate>
      <UsersContent />
    </PlatformAdminGate>
  </PageShell>
);

