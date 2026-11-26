import { IconChevronDown } from "@tabler/icons-react";
import {
  Burger,
  Center,
  Collapse,
  Container,
  Divider,
  Drawer,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { UserMenu } from "@/components/UserMenu";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import classes from "./HeaderMenu.module.css";

type NavItem = {
  to: string;
  label: string;
  links?: { to: string; label: string }[];
};

const LINKS: NavItem[] = [
  {
    to: "/",
    label: "概览",
    links: [
      { to: "/", label: "首页" },
      { to: "/dashboard", label: "工作台" },
    ],
  },
  {
    to: "/access/users",
    label: "权限管理",
    links: [
      { to: "/access/users", label: "用户" },
      { to: "/access/roles", label: "角色" },
      { to: "/access/tenants", label: "租户" },
      { to: "/access/permissions", label: "权限" },
    ],
  },
  { to: "/settings", label: "设置" },
];

// 基于 ui.mantine.dev 官方 HeaderMenu：hover 下拉 + 移动端 Drawer
export const HeaderMenu = () => {
  const [opened, { toggle, close }] = useDisclosure(false);

  const items = LINKS.map((link) => {
    const menuItems = link.links?.map((item) => (
      <Menu.Item key={item.to} component={Link} to={item.to}>
        {item.label}
      </Menu.Item>
    ));

    if (menuItems) {
      return (
        <Menu key={link.label} trigger="hover" transitionProps={{ exitDuration: 0 }} withinPortal>
          <Menu.Target>
            <Link to={link.to} className={classes.link} onClick={(e) => e.preventDefault()}>
              <Center>
                <span className={classes.linkLabel}>{link.label}</span>
                <IconChevronDown size={14} stroke={1.5} />
              </Center>
            </Link>
          </Menu.Target>
          <Menu.Dropdown>{menuItems}</Menu.Dropdown>
        </Menu>
      );
    }

    return (
      <Link key={link.label} to={link.to} className={classes.link}>
        {link.label}
      </Link>
    );
  });

  return (
    <header className={classes.header}>
      <Container size="md">
        <div className={classes.inner}>
          <Text fw={700}>starter</Text>
          <Group gap={5} visibleFrom="sm">
            {items}
            <UserMenu variant="header" />
          </Group>
          <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" aria-label="打开菜单" />
        </div>
      </Container>

      <Drawer opened={opened} onClose={close} size="100%" padding="md" title="Navigation" hiddenFrom="sm" zIndex={1000000}>
        <AdminScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          {LINKS.map((link) =>
            link.links ? (
              <DrawerLinksGroup key={link.label} link={link} />
            ) : (
              <Link key={link.label} to={link.to} className={classes.link}>
                {link.label}
              </Link>
            ),
          )}
        </AdminScrollArea>
        <UserMenu variant="drawer" />
      </Drawer>
    </header>
  );
};

const DrawerLinksGroup = ({ link }: { link: NavItem }) => {
  const [opened, { toggle }] = useDisclosure(false);
  return (
    <>
      <UnstyledButton className={classes.link} onClick={toggle}>
        <Center inline>
          <span className={classes.linkLabel}>{link.label}</span>
          <IconChevronDown size={14} stroke={1.5} />
        </Center>
      </UnstyledButton>
      <Collapse expanded={opened}>
        {link.links?.map((sub) => (
          <Link key={sub.to} to={sub.to} className={classes.subLink}>
            {sub.label}
          </Link>
        ))}
      </Collapse>
    </>
  );
};

