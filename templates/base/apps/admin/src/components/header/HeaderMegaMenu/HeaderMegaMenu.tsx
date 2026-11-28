import { Fragment, useState } from "react";
import {
  IconChevronDown,
  IconGauge,
  type TablerIcon,
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
import { useNavigation, type NavNode } from "@/lib/navigation";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import classes from "./HeaderMegaMenu.module.css";

type MegaItem = NavNode & { to: string };

const MegaLinks = ({ items }: { items: MegaItem[] }) => {
  const theme = useMantineTheme();
  return (
    <SimpleGrid cols={2} spacing={0}>
      {items.map((item) => {
        const Icon: TablerIcon = item.icon ?? IconGauge;
        return (
          <UnstyledButton
            key={item.key}
            component={Link}
            to={item.to}
            className={classes.subLink}
          >
            <Group wrap="nowrap" align="flex-start">
              <ThemeIcon size={34} variant="default" radius="md">
                <Icon size={22} color={theme.colors.blue[6]} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={500}>{item.label}</Text>
                <Text size="xs" c="dimmed">{item.description}</Text>
              </div>
            </Group>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
};

const leafItems = (node: NavNode): MegaItem[] =>
  (node.children ?? []).filter(
    (child): child is MegaItem => Boolean(child.to) && !child.children?.length,
  );

// 基于 ui.mantine.dev 官方 HeaderMegaMenu：同一棵 NAV_TREE 渲染为 hover 卡片 + 移动端 Drawer
export const HeaderMegaMenu = () => {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const { user, onLogout } = useAuthUser();
  const { tree } = useNavigation();

  const toggleGroup = (key: string) => {
    setOpenGroups((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  return (
    <Box>
      <header className={classes.header}>
        <>
          <Brand />

          <Group className={classes.nav} h="100%" gap={0} visibleFrom="sm">
            {tree.map((node) => {
              const children = leafItems(node);
              const Icon: TablerIcon = node.icon ?? IconGauge;
              const first = children[0];

              if (children.length === 0) {
                return (
                  <Link
                    key={node.key}
                    to={node.to ?? "/"}
                    className={classes.link}
                  >
                    <Center inline>
                      <Icon size={16} />
                      <Box component="span" ml={5}>{node.label}</Box>
                    </Center>
                  </Link>
                );
              }

              return (
                <HoverCard
                  key={node.key}
                  width={620}
                  position="bottom"
                  radius="md"
                  shadow="md"
                  withinPortal
                >
                  <HoverCard.Target>
                    <Link
                      to={first?.to ?? "/"}
                      className={classes.link}
                      onClick={(event) => event.preventDefault()}
                    >
                      <Center inline>
                        <Icon size={16} />
                        <Box component="span" ml={5}>{node.label}</Box>
                        <IconChevronDown size={16} style={{ marginLeft: 5 }} />
                      </Center>
                    </Link>
                  </HoverCard.Target>
                  <HoverCard.Dropdown style={{ overflow: "hidden" }}>
                    <Group justify="space-between" px="md">
                      <Text fw={500}>{node.label}</Text>
                      <Anchor component={Link} to={first?.to ?? "/"} fz="xs">
                        查看全部
                      </Anchor>
                    </Group>
                    <Divider my="sm" />
                    <MegaLinks items={children} />
                  </HoverCard.Dropdown>
                </HoverCard>
              );
            })}
          </Group>

          <Group gap="xs">
            <Box visibleFrom="sm">
              <UserMenu variant="header" user={user} onLogout={onLogout} />
            </Box>
            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              hiddenFrom="sm"
              aria-label="打开菜单"
            />
          </Group>
        </>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Navigation"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <AdminScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          {tree.map((node) => {
            const children = leafItems(node);
            const Icon: TablerIcon = node.icon ?? IconGauge;
            const opened = openGroups.includes(node.key);

            if (children.length === 0) {
              return (
                <Link
                  key={node.key}
                  to={node.to ?? "/"}
                  className={classes.link}
                >
                  <Center inline>
                    <Icon size={16} />
                    <Box component="span" ml={5}>{node.label}</Box>
                  </Center>
                </Link>
              );
            }

            return (
              <Fragment key={node.key}>
                <UnstyledButton
                  className={classes.link}
                  onClick={() => toggleGroup(node.key)}
                >
                  <Center inline>
                    <Icon size={16} />
                    <Box component="span" ml={5}>{node.label}</Box>
                    <IconChevronDown
                      size={16}
                      style={{
                        marginLeft: 5,
                        transform: opened ? "rotate(180deg)" : undefined,
                      }}
                    />
                  </Center>
                </UnstyledButton>
                <Collapse expanded={opened}>
                  <MegaLinks items={children} />
                </Collapse>
              </Fragment>
            );
          })}
        </AdminScrollArea>
        <UserMenu variant="drawer" user={user} onLogout={onLogout} />
      </Drawer>
    </Box>
  );
};
