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
import { LinksGroup } from "@/components/navbar/NavbarLinksGroup";
import { useAuthUser } from "@/lib/use-auth-user";
import classes from "./NavbarNested.module.css";

const MENU: {
  label: string;
  icon: TablerIcon;
  initiallyOpened?: boolean;
  links: { label: string; link: string }[];
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
      { label: "用户", link: "/access/users" },
      { label: "角色", link: "/access/roles" },
      { label: "租户", link: "/access/tenants" },
      { label: "权限", link: "/access/permissions" },
    ],
  },
  {
    label: "系统",
    icon: IconAdjustments,
    initiallyOpened: true,
    links: [
      { label: "设置", link: "/settings" },
      { label: "日志", link: "/observability/logs" },
      { label: "审计日志", link: "/observability/audit-logs" },
      { label: "接口联调", link: "/integration" },
    ],
  },
];

// 基于 ui.mantine.dev 官方 NavbarNested：分组 + 图标 + 可折叠，子项直接跳路由
export const NavbarNested = () => {
  const { user, onLogout } = useAuthUser();

  return (
  <nav className={classes.navbar}>
    <div className={classes.header}>
      <Group justify="space-between">
        <Brand />
        <Text size="xs" c="dimmed">管理菜单</Text>
      </Group>
    </div>
    <AdminScrollArea className={classes.links}>
      <div className={classes.linksInner}>
        {MENU.map((item) => (
          <LinksGroup {...item} key={item.label} />
        ))}
      </div>
    </AdminScrollArea>
    <UserMenu variant="sidebar" user={user} onLogout={onLogout} />
  </nav>
  );
};




