import { PageShell } from "@/components/PageShell";
import { DashboardContent } from "./DashboardContent";

/** 工作台页：页面壳 + 可复用的待办内容。 */
export const DashboardPage = () => (
  <PageShell title="工作台" description="查看系统待办与运行状态">
    <DashboardContent />
  </PageShell>
);

