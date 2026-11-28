import { IconGauge, type TablerIcon } from "@tabler/icons-react";
import { Group, Text } from "@mantine/core";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { LinksGroup, NavbarLeaf } from "@/components/navbar/NavbarLinksGroup";
import { useAuthUser } from "@/lib/use-auth-user";
import { useNavigation } from "@/lib/navigation";
import classes from "./NavbarNested.module.css";

// 基于 ui.mantine.dev 官方 NavbarNested：同一棵 NAV_TREE 渲染为分组 + 折叠子项
export const NavbarNested = () => {
  const { user, onLogout } = useAuthUser();
  const { tree } = useNavigation();

  return (
    <nav className={classes.navbar}>
      <div className={classes.header}>
        <Group justify="space-between">
          <Brand />
          <Text size="xs" c="dimmed">
            管理菜单
          </Text>
        </Group>
      </div>
      <AdminScrollArea className={classes.links}>
        <div className={classes.linksInner}>
          {tree.map((item) => {
            const Icon: TablerIcon = item.icon ?? IconGauge;
            if (item.children?.length) {
              return (
                <LinksGroup
                  key={item.key}
                  icon={Icon}
                  label={item.label}
                  initiallyOpened={item.initiallyOpened}
                  links={item.children
                    .filter((child) => child.to)
                    .map((child) => ({
                      label: child.label,
                      link: child.to!,
                    }))}
                />
              );
            }
            if (!item.to) return null;
            return (
              <NavbarLeaf
                key={item.key}
                icon={Icon}
                label={item.label}
                to={item.to}
              />
            );
          })}
        </div>
      </AdminScrollArea>
      <UserMenu variant="sidebar" user={user} onLogout={onLogout} />
    </nav>
  );
};
