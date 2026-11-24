import { createFileRoute } from "@tanstack/react-router";
import { PermissionsPage } from "@/features/access/permissions";

export const Route = createFileRoute("/access/permissions")({
  component: PermissionsPage,
});

