import { createFileRoute } from "@tanstack/react-router";
import { PermissionsPage } from "../../features/access/permissions/PermissionsPage";

export const Route = createFileRoute("/access/permissions")({
  component: PermissionsPage,
});
