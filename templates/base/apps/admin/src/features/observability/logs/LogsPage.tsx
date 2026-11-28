import { PageShell } from "@/components/PageShell";
import { PlatformAdminGate } from "@/components/Permission";
import { LogsContent } from "./LogsContent";

/** 日志检索 页：页面壳（PageShell）+ 可复用内容（LogsContent） */
export const LogsPage = () => (
  <PageShell
    title="日志"
    description="按时间、级别、traceId 检索平台请求日志（数据来自 Loki）"
  >
    <PlatformAdminGate>
      <LogsContent />
    </PlatformAdminGate>
  </PageShell>
);
