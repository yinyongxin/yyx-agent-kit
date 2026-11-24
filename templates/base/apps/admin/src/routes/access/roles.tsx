import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "../../features/access/roles/RolesPage";

export const Route = createFileRoute("/access/roles")({
  component: RolesPage,
});
