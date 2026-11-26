import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

// 管理后台默认页就是工作台，不再单独做首页
export const Route = createFileRoute("/")({
  component: DashboardPage,
});
