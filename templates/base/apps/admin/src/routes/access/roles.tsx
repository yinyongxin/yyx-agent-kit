import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/features/access/roles";

export const Route = createFileRoute("/access/roles")({
  component: RolesPage,
});

