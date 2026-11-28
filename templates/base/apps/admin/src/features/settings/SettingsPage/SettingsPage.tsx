import { PageShell } from "@/components/PageShell";
import { SettingsContent } from "./SettingsContent";

/** 系统设置页：页面壳 + 可复用内容。 */
export const SettingsPage = () => (
  <PageShell title="账号设置" description="个人资料与密码">
    <SettingsContent />
  </PageShell>
);

