import {
  IconBook,
  IconChartPie3,
  IconChevronDown,
  IconCoin,
  IconFingerprint,
  IconGauge,
  IconHome2,
  IconSettings,
} from "@tabler/icons-react";
import {
  Anchor,
  Box,
  Burger,
  Center,
  Collapse,
  Divider,
  Drawer,
  Group,
  HoverCard,
  SimpleGrid,
  Text,
  ThemeIcon,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { UserMenu } from "@/components/UserMenu";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import classes from "./HeaderMegaMenu.module.css";

type MegaItem = { icon: typeof IconHome2; title: string; description: string; to: string };

const OVERVIEW: MegaItem[] = [
  { icon: IconHome2, title: "首页", description: "后端连通状态", to: "/" },
  { icon: IconGauge, title: "工作台", description: "待办列表", to: "/dashboard" },
];

const PERMISSIONS: MegaItem[] = [
  { icon: IconFingerprint, title: "用户", description: "用户管理", to: "/access/users" },
  { icon: IconBook, title: "角色", description: "角色管理", to: "/access/roles" },
  { icon: IconCoin, title: "租户", description: "租户管理", to: "/access/tenants" },
  { icon: IconChartPie3, title: "权限", description: "权限管理", to: "/access/permissions" },
];

const MegaLinks = ({ items }: { items: MegaItem[] }) => {
  const theme = useMantineTheme();
  return (
    <SimpleGrid cols={2} spacing={0}>
      {items.map((item) => (
        <UnstyledButton
          key={item.title}
          component={Link}
          to={item.to}
          className={classes.subLink}
        >
          <Group wrap="nowrap" align="flex-start">
            <ThemeIcon size={34} variant="default" radius="md">
              <item.icon size={22} color={theme.colors.blue[6]} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>{item.title}</Text>
              <Text size="xs" c="dimmed">{item.description}</Text>
            </div>
          </Group>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  );
};

// 基于 ui.mantine.dev 官方 HeaderMegaMenu：hover 卡片大菜单 + 移动端 Drawer
export const HeaderMegaMenu = () => {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const [linksOpened, { toggle: toggleLinks }] = useDisclosure(false);

  return (
    <Box>
      <header className={classes.header}>
        <>
          <Text fw={700}>starter</Text>

          <Group className={classes.nav} h="100%" gap={0} visibleFrom="sm">
            <Link to="/" className={classes.link}>首页</Link>
            <HoverCard width={520} position="bottom" radius="md" shadow="md" withinPortal>
              <HoverCard.Target>
                <Link to="/" className={classes.link} onClick={(e) => e.preventDefault()}>
                  <Center inline>
                    <Box component="span" mr={5}>概览</Box>
                    <IconChevronDown size={16} />
                  </Center>
                </Link>
              </HoverCard.Target>
              <HoverCard.Dropdown style={{ overflow: "hidden" }}>
                <Group justify="space-between" px="md">
                  <Text fw={500}>概览</Text>
                  <Anchor component={Link} to="/" fz="xs">查看首页</Anchor>
                </Group>
                <Divider my="sm" />
                <MegaLinks items={OVERVIEW} />
              </HoverCard.Dropdown>
            </HoverCard>
            <HoverCard width={600} position="bottom" radius="md" shadow="md" withinPortal>
              <HoverCard.Target>
                <Link to="/access/users" className={classes.link} onClick={(e) => e.preventDefault()}>
                  <Center inline>
                    <Box component="span" mr={5}>权限管理</Box>
                    <IconChevronDown size={16} />
                  </Center>
                </Link>
              </HoverCard.Target>
              <HoverCard.Dropdown style={{ overflow: "hidden" }}>
                <Group justify="space-between" px="md">
                  <Text fw={500}>权限管理</Text>
                  <Anchor component={Link} to="/access/users" fz="xs">查看全部</Anchor>
                </Group>
                <Divider my="sm" />
                <MegaLinks items={PERMISSIONS} />
                <div className={classes.dropdownFooter}>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500} fz="sm">系统设置</Text>
                      <Text size="xs" c="dimmed">租户与权限配置</Text>
                    </div>
                    <Anchor component={Link} to="/settings" fz="xs">前往设置</Anchor>
                  </Group>
                </div>
              </HoverCard.Dropdown>
            </HoverCard>
            <Link to="/settings" className={classes.link}>
              <Center inline><IconSettings size={16} /><Box component="span" ml={5}>设置</Box></Center>
            </Link>
          </Group>

          <Group gap="xs">
            <Box visibleFrom="sm"><UserMenu variant="header" /></Box>
            <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm" aria-label="打开菜单" />
          </Group>
        </>
      </header>

      <Drawer opened={drawerOpened} onClose={closeDrawer} size="100%" padding="md" title="Navigation" hiddenFrom="sm" zIndex={1000000}>
        <AdminScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          <Link to="/" className={classes.link}>首页</Link>
          <UnstyledButton className={classes.link} onClick={toggleLinks}>
            <Center inline>
              <Box component="span" mr={5}>概览</Box>
              <IconChevronDown size={16} />
            </Center>
          </UnstyledButton>
          <Collapse expanded={linksOpened}>
            <MegaLinks items={OVERVIEW} />
          </Collapse>
          <UnstyledButton className={classes.link} onClick={toggleLinks}>
            <Center inline>
              <Box component="span" mr={5}>权限管理</Box>
              <IconChevronDown size={16} />
            </Center>
          </UnstyledButton>
          <Collapse expanded={linksOpened}>
            <MegaLinks items={PERMISSIONS} />
          </Collapse>
          <Link to="/settings" className={classes.link}>设置</Link>
        </AdminScrollArea>
        <UserMenu variant="drawer" />
      </Drawer>
    </Box>
  );
};

