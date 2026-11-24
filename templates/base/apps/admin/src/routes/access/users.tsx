import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "../../features/access/users/UsersPage";

export const Route = createFileRoute("/access/users")({
  component: UsersPage,
});
