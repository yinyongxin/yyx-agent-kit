import { useMe } from "./me";
import { usePermissions } from "./permissions";

/** 菜单元信息：平台专属，或需要某个租户权限点 */
export type MenuLinkMeta = {
  platformOnly?: boolean;
  permission?: string;
};

/**
 * 导航过滤规则：
 * - 平台专属菜单：仅 `isPlatformAdmin`
 * - 租户菜单：`isPlatformAdmin` 直接可见，否则要求当前租户具备对应权限
 * - 未标注的通用菜单（工作台 / 设置 / 接口联调）所有人可见
 */
export const useMenuAccess = () => {
  const { me } = useMe();
  const { can } = usePermissions();
  const isPlatformAdmin = me?.isPlatformAdmin ?? false;

  const canSee = (meta: MenuLinkMeta): boolean => {
    if (meta.platformOnly && !isPlatformAdmin) return false;
    if (meta.permission && !isPlatformAdmin && !can(meta.permission)) {
      return false;
    }
    return true;
  };

  return { isPlatformAdmin, canSee };
};
