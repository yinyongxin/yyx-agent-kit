import { createRootRoute } from "@tanstack/react-router";
import { AdminLayout } from "../components/AdminLayout";

export const Route = createRootRoute({
  component: AdminLayout,
});
