import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "../../features/access/RolesPage";

export const Route = createFileRoute("/access/roles")({
  component: RolesPage,
});
