import {
  IconAdjustments,
  IconGauge,
  IconLock,
  type TablerIcon,
} from "@tabler/icons-react";
import { Group, Text } from "@mantine/core";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { LinksGroup } from "@/components/navbar/NavbarLinksGroup";
import { useAuthUser } from "@/lib/use-auth-user";
import { useMenuAccess, type MenuLinkMeta } from "@/lib/menu-access";
import classes from "./NavbarNested.module.css";

type MenuLink = MenuLinkMeta & { label: string; link: string };

const MENU: {
  label: string;
  icon: TablerIcon;
  initiallyOpened?: boolean;
  links: MenuLink[];
}[] = [
  {
    label: "概览",
    icon: IconGauge,
    initiallyOpened: true,
    links: [{ label: "工作台", link: "/" }],
  },
  {
    label: "权限管理",
    icon: IconLock,
    initiallyOpened: true,
    links: [
      { label: "用户", link: "/access/users", platformOnly: true },
      { label: "角色", link: "/access/roles", permission: "role:read" },
      { label: "租户", link: "/access/tenants", platformOnly: true },
      { label: "权限", link: "/access/permissions", platformOnly: true },
    ],
  },
  {
    label: "系统",
    icon: IconAdjustments,
    initiallyOpened: true,
    links: [
      { label: "账号设置", link: "/settings" },
      { label: "日志", link: "/observability/logs", platformOnly: true },
      { label: "审计日志", link: "/observability/audit-logs", platformOnly: true },
      { label: "接口联调", link: "/integration" },
    ],
  },
];

// 基于 ui.mantine.dev 官方 NavbarNested：分组 + 图标 + 可折叠，子项直接跳路由
export const NavbarNested = () => {
  const { user, onLogout } = useAuthUser();
  const { canSee } = useMenuAccess();
  const menu = MENU.map((item) => ({
    ...item,
    links: item.links.filter(canSee),
  })).filter((item) => item.links.length > 0);

  return (
    <nav className={classes.navbar}>
      <div className={classes.header}>
        <Group justify="space-between">
          <Brand />
          <Text size="xs" c="dimmed">
            管理菜单
          </Text>
        </Group>
        <TenantSwitcher withLabel />
      </div>
      <AdminScrollArea className={classes.links}>
        <div className={classes.linksInner}>
          {menu.map((item) => (
            <LinksGroup {...item} key={item.label} />
          ))}
        </div>
      </AdminScrollArea>
      <UserMenu variant="sidebar" user={user} onLogout={onLogout} />
    </nav>
  );
};
