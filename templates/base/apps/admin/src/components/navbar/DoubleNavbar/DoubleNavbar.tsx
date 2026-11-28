import {
  IconHome2,
  IconLock,
  IconSettings,
  type TablerIcon,
} from "@tabler/icons-react";
import { Title, Tooltip, UnstyledButton } from "@mantine/core";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "@/lib/use-auth-user";
import { useMenuAccess, type MenuLinkMeta } from "@/lib/menu-access";
import classes from "./DoubleNavbar.module.css";

type DoubleLink = MenuLinkMeta & { label: string; to: string };

const GROUPS: {
  label: string;
  icon: TablerIcon;
  links: DoubleLink[];
}[] = [
  {
    label: "概览",
    icon: IconHome2,
    links: [{ label: "工作台", to: "/" }],
  },
  {
    label: "权限管理",
    icon: IconLock,
    links: [
      { label: "用户", to: "/access/users", platformOnly: true },
      { label: "角色", to: "/access/roles", permission: "role:read" },
      { label: "租户", to: "/access/tenants", platformOnly: true },
      { label: "权限", to: "/access/permissions", platformOnly: true },
    ],
  },
  {
    label: "系统",
    icon: IconSettings,
    links: [
      { label: "设置", to: "/settings" },
      { label: "日志", to: "/observability/logs", platformOnly: true },
      { label: "审计日志", to: "/observability/audit-logs", platformOnly: true },
      { label: "接口联调", to: "/integration" },
    ],
  },
];

/** 从当前路由推导激活组；只从可见菜单里找，找不到回到第一组 */
const groupForPath = (groups: typeof GROUPS, pathname: string) =>
  groups.find((item) =>
    item.links.some((link) =>
      link.to === "/" ? pathname === "/" : pathname.startsWith(link.to),
    ),
  ) ?? groups[0];

// 基于 ui.mantine.dev 官方 DoubleNavbar：左侧图标主导航 + 右侧文字子导航
export const DoubleNavbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, onLogout } = useAuthUser();
  const { canSee } = useMenuAccess();

  const groups = GROUPS.map((item) => ({
    ...item,
    links: item.links.filter(canSee),
  })).filter((item) => item.links.length > 0);
  const group = groupForPath(groups, pathname);
  if (!group) return null;

  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div className={classes.logo}>
            <Brand compact />
          </div>
          {/* 上：logo；中：一级图标菜单占满并可滚动；下：头像 */}
          <AdminScrollArea className={classes.mainLinks}>
            <div className={classes.mainLinksInner}>
              {groups.map((item) => (
                <Tooltip
                  label={item.label}
                  position="right"
                  withArrow
                  transitionProps={{ duration: 0 }}
                  key={item.label}
                >
                  <UnstyledButton
                    onClick={() => navigate({ to: item.links[0]!.to })}
                    className={classes.mainLink}
                    data-active={item.label === group.label || undefined}
                    aria-label={item.label}
                  >
                    <item.icon size={22} stroke={1.5} />
                  </UnstyledButton>
                </Tooltip>
              ))}
            </div>
          </AdminScrollArea>
          <UserMenu variant="icon" user={user} onLogout={onLogout} />
        </div>
        <div className={classes.main}>
          <Title order={4} className={classes.title}>
            {group.label}
          </Title>
          <AdminScrollArea className={classes.links}>
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
