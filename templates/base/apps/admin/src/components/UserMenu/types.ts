import type { ReactNode } from "react";

/** 四种形态覆盖四种菜单：sidebar 嵌套侧栏、icon 双栏侧栏头像、header 两种顶栏、drawer 移动端抽屉 */
export type UserMenuVariant = "sidebar" | "icon" | "header" | "drawer";

export interface UserInfo {
  name: string;
  email: string;
  roleLabel?: string;
}

export interface UserMenuProps {
  variant?: UserMenuVariant;
  /** 不传则用模板示例用户；接入认证后由调用方传入真实用户 */
  user?: UserInfo;
  /** 设置页路由 */
  settingsTo?: string;
  /** 退出登录回调；未接认证时不传，菜单项显示「待接入」且禁用 */
  onLogout?: () => void;
  /** 面板里额外的操作项（如个人中心），由业务注入 */
  extraItems?: ReactNode;
}
