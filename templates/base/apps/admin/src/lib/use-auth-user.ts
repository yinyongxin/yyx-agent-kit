import { useNavigate } from "@tanstack/react-router";
import { authStore } from "./auth";
import { useMe } from "./me";

/** 从登录态与 /me 派生 UserMenu 需要的用户信息与退出回调 */
export const useAuthUser = () => {
  const navigate = useNavigate();
  const { me } = useMe();
  const email = authStore.getEmail() ?? "";
  const localPart = email.split("@")[0] ?? "";
  const name = me?.displayName || localPart || "管理员";
  const roleLabel = me?.isPlatformAdmin ? "平台管理员" : "租户成员";

  return {
    user: { name, email, roleLabel },
    onLogout: () => {
      authStore.clear();
      navigate({ to: "/login" });
    },
  };
};
