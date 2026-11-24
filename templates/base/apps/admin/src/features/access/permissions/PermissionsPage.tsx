import { PageShell } from "../../../components/PageShell";
import { PermissionsContent } from "./PermissionsContent";

/** 权限管理 页：页面壳（PageShell）+ 可复用内容（PermissionsContent）。 */
export const PermissionsPage = () => (
  <PageShell title="权限管理" description="管理系统权限">
    <PermissionsContent />
  </PageShell>
);
