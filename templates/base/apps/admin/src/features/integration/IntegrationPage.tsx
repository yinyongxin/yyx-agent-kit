import { PageShell } from "@/components/PageShell";
import { IntegrationContent } from "./IntegrationContent";

export const IntegrationPage = () => (
  <PageShell
    title="接口联调"
    description="用 OpenAPI 生成的客户端调用真实后端：登录 → 租户列表 → 成员与角色"
  >
    <IntegrationContent />
  </PageShell>
);
