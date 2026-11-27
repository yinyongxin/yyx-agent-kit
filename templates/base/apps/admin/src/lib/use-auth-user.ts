import { useNavigate } from "@tanstack/react-router";
import { authStore } from "./auth";

/** 从登录态派生 UserMenu 需要的用户信息与退出回调 */
export const useAuthUser = () => {
  const navigate = useNavigate();
  const email = authStore.getEmail() ?? "";
  const localPart = email.split("@")[0] ?? "";
  const name = localPart || "管理员";

  return {
    user: { name, email, roleLabel: "平台管理员" },
    onLogout: () => {
      authStore.clear();
      navigate({ to: "/login" });
    },
  };
};
