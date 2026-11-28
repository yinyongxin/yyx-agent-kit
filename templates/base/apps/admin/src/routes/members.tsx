import { createFileRoute } from "@tanstack/react-router";
import { CurrentTenantMembersPage } from "@/features/access/tenant-members";

export const Route = createFileRoute("/members")({
  component: CurrentTenantMembersPage,
});
