import { IconHome2, type TablerIcon } from "@tabler/icons-react";
import { Title, Tooltip, UnstyledButton } from "@mantine/core";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "@/lib/use-auth-user";
import { useNavigation, type NavNode } from "@/lib/navigation";
import classes from "./DoubleNavbar.module.css";

type NavLink = NavNode & { to: string };
type NavGroup = NavNode & { links: NavLink[] };

const toLink = (node: NavNode): NavLink | null =>
  node.to ? { ...node, to: node.to } : null;

const toLinks = (node: NavNode): NavLink[] => {
  if (node.children?.length) {
    return node.children
      .map(toLink)
      .filter((child): child is NavLink => Boolean(child));
  }
  const link = toLink(node);
  return link ? [link] : [];
};

/** 从当前路由推导激活组；只从可见菜单里找，找不到回到第一组 */
const groupForPath = (groups: NavGroup[], pathname: string) =>
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
  const { tree } = useNavigation();

  const groups: NavGroup[] = tree
    .map((node) => ({ ...node, links: toLinks(node) }))
    .filter((node) => node.links.length > 0);
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
              {groups.map((item) => {
                const Icon: TablerIcon = item.icon ?? IconHome2;
                return (
                  <Tooltip
                    label={item.label}
                    position="right"
                    withArrow
                    transitionProps={{ duration: 0 }}
                    key={item.key}
                  >
                    <UnstyledButton
                      onClick={() => navigate({ to: item.links[0]!.to })}
                      className={classes.mainLink}
                      data-active={item.key === group.key || undefined}
                      aria-label={item.label}
                    >
                      <Icon size={22} stroke={1.5} />
                    </UnstyledButton>
                  </Tooltip>
                );
              })}
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
                key={link.key}
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
