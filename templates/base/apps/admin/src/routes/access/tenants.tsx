import { createFileRoute } from "@tanstack/react-router";
import { TenantsPage } from "@/features/access/tenants";

export const Route = createFileRoute("/access/tenants")({
  component: TenantsPage,
});

