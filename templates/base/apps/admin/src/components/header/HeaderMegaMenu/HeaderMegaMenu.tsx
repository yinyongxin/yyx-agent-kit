import {
  IconBook,
  IconChartPie3,
  IconChevronDown,
  IconCoin,
  IconFingerprint,
  IconFiles,
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
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { useAuthUser } from "@/lib/use-auth-user";
import { useMenuAccess, type MenuLinkMeta } from "@/lib/menu-access";
import { PERMISSIONS as PERMISSION_CODES } from "@starter/shared";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import classes from "./HeaderMegaMenu.module.css";

type MegaItem = MenuLinkMeta & {
  icon: typeof IconHome2;
  title: string;
  description: string;
  to: string;
};

const OVERVIEW: MegaItem[] = [
  { icon: IconGauge, title: "工作台", description: "待办列表与常用入口", to: "/" },
];

const PERMISSIONS: MegaItem[] = [
  { icon: IconFingerprint, title: "用户", description: "用户管理", to: "/access/users", platformOnly: true },
  { icon: IconBook, title: "角色", description: "角色管理", to: "/access/roles", permission: "role:read" },
  { icon: IconCoin, title: "租户", description: "租户管理", to: "/access/tenants", platformOnly: true },
  { icon: IconChartPie3, title: "权限", description: "权限管理", to: "/access/permissions", platformOnly: true },
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
  const { user, onLogout } = useAuthUser();
  const { isPlatformAdmin, canSee } = useMenuAccess();
  const permissionItems = PERMISSIONS.filter(canSee);

  return (
    <Box>
      <header className={classes.header}>
        <>
          <Brand />

          <Group className={classes.nav} h="100%" gap={0} visibleFrom="sm">
            <Link to="/" className={classes.link}>工作台</Link>
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
                  <Anchor component={Link} to="/" fz="xs">前往工作台</Anchor>
                </Group>
                <Divider my="sm" />
                <MegaLinks items={OVERVIEW} />
              </HoverCard.Dropdown>
            </HoverCard>
            {permissionItems.length > 0 && (
            <HoverCard width={600} position="bottom" radius="md" shadow="md" withinPortal>
              <HoverCard.Target>
                <Link to={permissionItems[0]?.to ?? "/"} className={classes.link} onClick={(e) => e.preventDefault()}>
                  <Center inline>
                    <Box component="span" mr={5}>权限管理</Box>
                    <IconChevronDown size={16} />
                  </Center>
                </Link>
              </HoverCard.Target>
              <HoverCard.Dropdown style={{ overflow: "hidden" }}>
                <Group justify="space-between" px="md">
                  <Text fw={500}>权限管理</Text>
                  <Anchor component={Link} to={permissionItems[0]?.to ?? "/"} fz="xs">查看全部</Anchor>
                </Group>
                <Divider my="sm" />
                <MegaLinks items={permissionItems} />
                <div className={classes.dropdownFooter}>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500} fz="sm">账号设置</Text>
                      <Text size="xs" c="dimmed">个人资料与密码</Text>
                    </div>
                    <Anchor component={Link} to="/settings" fz="xs">前往账号设置</Anchor>
                  </Group>
                </div>
              </HoverCard.Dropdown>
            </HoverCard>
            )}
            <Link to="/settings" className={classes.link}>
              <Center inline><IconSettings size={16} /><Box component="span" ml={5}>账号设置</Box></Center>
            </Link>
            {canSee({ permission: PERMISSION_CODES.fileRead }) && (
              <Link to="/files" className={classes.link}>
                <Center inline><IconFiles size={16} /><Box component="span" ml={5}>文件</Box></Center>
              </Link>
            )}
            {isPlatformAdmin && (
              <>
                <Link to="/observability/logs" className={classes.link}>日志</Link>
                <Link to="/observability/audit-logs" className={classes.link}>审计日志</Link>
              </>
            )}
          </Group>

          <Group gap="xs">
            <Box visibleFrom="sm"><UserMenu variant="header" user={user} onLogout={onLogout} /></Box>
            <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm" aria-label="打开菜单" />
          </Group>
        </>
      </header>

      <Drawer opened={drawerOpened} onClose={closeDrawer} size="100%" padding="md" title="Navigation" hiddenFrom="sm" zIndex={1000000}>
        <AdminScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          <Link to="/" className={classes.link}>工作台</Link>
          <UnstyledButton className={classes.link} onClick={toggleLinks}>
            <Center inline>
              <Box component="span" mr={5}>概览</Box>
              <IconChevronDown size={16} />
            </Center>
          </UnstyledButton>
          <Collapse expanded={linksOpened}>
            <MegaLinks items={OVERVIEW} />
          </Collapse>
          {permissionItems.length > 0 && (
            <>
              <UnstyledButton className={classes.link} onClick={toggleLinks}>
                <Center inline>
                  <Box component="span" mr={5}>权限管理</Box>
                  <IconChevronDown size={16} />
                </Center>
              </UnstyledButton>
              <Collapse expanded={linksOpened}>
                <MegaLinks items={permissionItems} />
              </Collapse>
            </>
          )}
          <Link to="/settings" className={classes.link}>账号设置</Link>
          {canSee({ permission: PERMISSION_CODES.fileRead }) && (
            <Link to="/files" className={classes.link}>文件</Link>
          )}
          {isPlatformAdmin && (
            <>
              <Link to="/observability/logs" className={classes.link}>日志</Link>
              <Link to="/observability/audit-logs" className={classes.link}>审计日志</Link>
            </>
          )}
        </AdminScrollArea>
        <UserMenu variant="drawer" user={user} onLogout={onLogout} />
      </Drawer>
    </Box>
  );
};

