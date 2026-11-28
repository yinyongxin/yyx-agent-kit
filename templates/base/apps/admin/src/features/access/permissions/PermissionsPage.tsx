import { PageShell } from "@/components/PageShell";
import { PlatformAdminGate } from "@/components/Permission";
import { PermissionsContent } from "./PermissionsContent";

/** 权限管理 页：页面壳（PageShell）+ 可复用内容（PermissionsContent）。 */
export const PermissionsPage = () => (
  <PageShell title="权限管理" description="查看全局权限点定义（由后端 seed / 迁移维护）">
    <PlatformAdminGate>
      <PermissionsContent />
    </PlatformAdminGate>
  </PageShell>
);

