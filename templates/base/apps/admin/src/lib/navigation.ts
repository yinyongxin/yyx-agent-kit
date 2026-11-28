import {
  IconBook,
  IconChartPie3,
  IconCoin,
  IconFileText,
  IconFiles,
  IconFingerprint,
  IconGauge,
  IconHistory,
  IconLock,
  IconPlugConnected,
  IconSettings,
  IconUserCircle,
  IconUsers,
  type TablerIcon,
} from "@tabler/icons-react";
import { PERMISSIONS } from "@starter/shared";
import { useMe } from "./me";
import { usePermissions } from "./permissions";

/**
 * 管理端导航唯一数据源。
 *
 * - 三种布局只负责渲染，不再各自维护菜单数组
 * - `platformOnly` / `permission` 在 `useNavigation()` 统一过滤
 * - 路由仍由 TanStack Router 文件路由维护，这里只引用 `to`
 */
export type NavNode = {
  key: string;
  label: string;
  icon?: TablerIcon;
  /** 叶子节点路由；分组节点不填 */
  to?: string;
  /** 顶部大菜单的说明文案，侧栏会忽略 */
  description?: string;
  /** 需要的租户权限点 */
  permission?: string;
  /** 仅平台管理员可见 */
  platformOnly?: boolean;
  /** 侧栏默认展开 */
  initiallyOpened?: boolean;
  children?: NavNode[];
};

export const NAV_TREE: NavNode[] = [
  {
    key: "dashboard",
    label: "工作台",
    icon: IconGauge,
    to: "/",
    description: "待办列表与常用入口",
  },
  {
    key: "access",
    label: "权限管理",
    icon: IconLock,
    initiallyOpened: true,
    children: [
      {
        key: "members",
        label: "成员",
        icon: IconUsers,
        to: "/members",
        description: "当前租户成员与角色分配",
        permission: PERMISSIONS.userRead,
      },
      {
        key: "users",
        label: "用户",
        icon: IconFingerprint,
        to: "/access/users",
        description: "平台用户管理",
        platformOnly: true,
      },
      {
        key: "roles",
        label: "角色",
        icon: IconBook,
        to: "/access/roles",
        description: "当前租户角色与权限",
        permission: PERMISSIONS.roleRead,
      },
      {
        key: "tenants",
        label: "租户",
        icon: IconCoin,
        to: "/access/tenants",
        description: "租户生命周期管理",
        platformOnly: true,
      },
      {
        key: "permissions",
        label: "权限",
        icon: IconChartPie3,
        to: "/access/permissions",
        description: "权限点目录",
        platformOnly: true,
      },
    ],
  },
  {
    key: "system",
    label: "系统",
    icon: IconSettings,
    initiallyOpened: true,
    children: [
      {
        key: "files",
        label: "文件",
        icon: IconFiles,
        to: "/files",
        description: "当前租户文件管理",
        permission: PERMISSIONS.fileRead,
      },
      {
        key: "settings",
        label: "账号设置",
        icon: IconUserCircle,
        to: "/settings",
        description: "个人资料与密码",
      },
      {
        key: "logs",
        label: "日志",
        icon: IconFileText,
        to: "/observability/logs",
        description: "Loki 日志检索",
        platformOnly: true,
      },
      {
        key: "audit-logs",
        label: "审计日志",
        icon: IconHistory,
        to: "/observability/audit-logs",
        description: "关键操作审计",
        platformOnly: true,
      },
      {
        key: "integration",
        label: "接口联调",
        icon: IconPlugConnected,
        to: "/integration",
        description: "OpenAPI 客户端联调",
      },
    ],
  },
];

const canSeeNode = (
  node: NavNode,
  isPlatformAdmin: boolean,
  can: (permission: string) => boolean,
): boolean => {
  if (node.platformOnly && !isPlatformAdmin) return false;
  if (node.permission && !isPlatformAdmin && !can(node.permission)) return false;
  return true;
};

const filterNode = (
  node: NavNode,
  isPlatformAdmin: boolean,
  can: (permission: string) => boolean,
): NavNode | null => {
  if (!canSeeNode(node, isPlatformAdmin, can)) return null;

  if (!node.children?.length) {
    return node.to ? node : null;
  }

  const children = node.children
    .map((child) => filterNode(child, isPlatformAdmin, can))
    .filter((child): child is NavNode => Boolean(child));

  return children.length > 0 ? { ...node, children } : null;
};

/** 当前用户可见的导航树；平台管理员绕过租户权限点 */
export const useNavigation = () => {
  const { me } = useMe();
  const { can } = usePermissions();
  const isPlatformAdmin = me?.isPlatformAdmin ?? false;

  const tree = NAV_TREE.map((node) =>
    filterNode(node, isPlatformAdmin, can),
  ).filter((node): node is NavNode => Boolean(node));

  return { tree, isPlatformAdmin };
};
