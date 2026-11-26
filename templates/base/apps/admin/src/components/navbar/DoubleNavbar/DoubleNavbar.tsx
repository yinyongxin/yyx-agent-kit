import {
  IconHome2,
  IconLock,
  IconSettings,
  type TablerIcon,
} from "@tabler/icons-react";
import { Title, Tooltip, UnstyledButton } from "@mantine/core";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import classes from "./DoubleNavbar.module.css";

const GROUPS: {
  label: string;
  icon: TablerIcon;
  links: { label: string; to: string }[];
}[] = [
  {
    label: "概览",
    icon: IconHome2,
    links: [
      { label: "首页", to: "/" },
      { label: "工作台", to: "/dashboard" },
    ],
  },
  {
    label: "权限管理",
    icon: IconLock,
    links: [
      { label: "用户", to: "/access/users" },
      { label: "角色", to: "/access/roles" },
      { label: "租户", to: "/access/tenants" },
      { label: "权限", to: "/access/permissions" },
    ],
  },
  {
    label: "系统",
    icon: IconSettings,
    links: [{ label: "设置", to: "/settings" }],
  },
];

// 基于 ui.mantine.dev 官方 DoubleNavbar：左侧图标主导航 + 右侧文字子导航
export const DoubleNavbar = () => {
  const [active, setActive] = useState("概览");
  const group = GROUPS.find((item) => item.label === active) ?? GROUPS[0]!;

  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div className={classes.logo}>S</div>
          {GROUPS.map((item) => (
            <Tooltip
              label={item.label}
              position="right"
              withArrow
              transitionProps={{ duration: 0 }}
              key={item.label}
            >
              <UnstyledButton
                onClick={() => setActive(item.label)}
                className={classes.mainLink}
                data-active={item.label === active || undefined}
                aria-label={item.label}
              >
                <item.icon size={22} stroke={1.5} />
              </UnstyledButton>
            </Tooltip>
          ))}
        </div>
        <div className={classes.main}>
          <Title order={4} className={classes.title}>
            {active}
          </Title>
          <AdminScrollArea h="calc(100% - 60px)">
            {group.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={classes.link}
                activeProps={{ className: classes.linkActive }}
              >
                {link.label}
              </Link>
            ))}
          </AdminScrollArea>
        </div>
      </div>
    </nav>
  );
};

