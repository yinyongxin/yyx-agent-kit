import { createFileRoute } from "@tanstack/react-router";
import { LogsPage } from "@/features/observability/logs";

export const Route = createFileRoute("/observability/logs")({
  component: LogsPage,
});
