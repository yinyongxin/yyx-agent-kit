import { createFileRoute } from "@tanstack/react-router";
import { TenantMembersPage } from "@/features/access/tenant-members";

const TenantMembersRoute = () => {
  const { tenantId } = Route.useParams();
  return <TenantMembersPage tenantId={tenantId} />;
};

export const Route = createFileRoute("/access/tenant-members/$tenantId")({
  component: TenantMembersRoute,
});
