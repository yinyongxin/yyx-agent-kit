import { createRootRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { authStore } from "@/lib/auth";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const onLoginPage = location.pathname === "/login";
    const authenticated = authStore.isAuthenticated();

    if (!authenticated && !onLoginPage) {
      throw redirect({ to: "/login" });
    }
    if (authenticated && onLoginPage) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});
