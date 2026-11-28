import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsPage } from "@/features/observability/audit-logs";

export const Route = createFileRoute("/observability/audit-logs")({
  component: AuditLogsPage,
});
