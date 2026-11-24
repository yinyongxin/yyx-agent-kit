import { PageShell } from "@/components/PageShell";
import { SettingsContent } from "./SettingsContent";

/** 系统设置页：页面壳 + 可复用内容。 */
export const SettingsPage = () => (
  <PageShell title="系统设置" description="配置系统参数">
    <SettingsContent />
  </PageShell>
);

