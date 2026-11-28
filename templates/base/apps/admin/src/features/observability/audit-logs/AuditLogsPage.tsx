import { PageShell } from "@/components/PageShell";
import { PlatformAdminGate } from "@/components/Permission";
import { AuditLogsContent } from "./AuditLogsContent";

/** 审计日志 页：页面壳（PageShell）+ 可复用内容（AuditLogsContent） */
export const AuditLogsPage = () => (
  <PageShell
    title="审计日志"
    description="关键写操作与登录事件（PostgreSQL，append-only）"
  >
    <PlatformAdminGate>
      <AuditLogsContent />
    </PlatformAdminGate>
  </PageShell>
);
