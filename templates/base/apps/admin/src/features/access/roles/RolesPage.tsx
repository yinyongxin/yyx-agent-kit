import { PageShell } from "../../../components/PageShell";
import { RolesContent } from "./RolesContent";

/** 角色管理 页：页面壳（PageShell）+ 可复用内容（RolesContent）。 */
export const RolesPage = () => (
  <PageShell title="角色管理" description="管理系统角色">
    <RolesContent />
  </PageShell>
);
