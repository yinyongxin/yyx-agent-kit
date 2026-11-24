import { PageShell } from "@/components/PageShell";
import { HomeContent } from "./HomeContent";

/** 首页：页面壳 + 后端连通状态内容。 */
export const HomePage = () => (
  <PageShell title="首页" description="系统概览">
    <HomeContent />
  </PageShell>
);

