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
import classes from "./DoubleNavbar.module.css";

const GROUPS: {
  label: string;
  icon: TablerIcon;
  links: { label: string; to: string }[];
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
      { label: "用户", to: "/access/users" },
      { label: "角色", to: "/access/roles" },
      { label: "租户", to: "/access/tenants" },
      { label: "权限", to: "/access/permissions" },
    ],
  },
  {
    label: "系统",
    icon: IconSettings,
    links: [
      { label: "设置", to: "/settings" },
      { label: "日志", to: "/observability/logs" },
      { label: "接口联调", to: "/integration" },
    ],
  },
];

/** 从当前路由推导激活组：进入 /access/users 时应显示「权限管理」组，而不是写死的「概览」 */
const groupForPath = (pathname: string) =>
  GROUPS.find((item) =>
    item.links.some((link) => (link.to === "/" ? pathname === "/" : pathname.startsWith(link.to))),
  ) ?? GROUPS[0]!;

// 基于 ui.mantine.dev 官方 DoubleNavbar：左侧图标主导航 + 右侧文字子导航
export const DoubleNavbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const group = groupForPath(pathname);
  const { user, onLogout } = useAuthUser();

  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div className={classes.logo}><Brand compact /></div>
          {/* 上：logo；中：一级图标菜单占满并可滚动；下：头像 */}
          <AdminScrollArea className={classes.mainLinks}>
            <div className={classes.mainLinksInner}>
              {GROUPS.map((item) => (
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

