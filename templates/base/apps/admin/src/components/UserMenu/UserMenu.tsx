import {
  IconCheck,
  IconChevronDown,
  IconDeviceDesktop,
  IconLogout,
  IconMoon,
  IconPalette,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import {
  Avatar,
  Group,
  Menu,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  type MantineColorScheme,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import classes from "./UserMenu.module.css";
import type { UserInfo, UserMenuProps } from "./types";

/** 模板示例用户：接入 @nestjs/authentication 后由调用方传真实用户替换 */
const DEMO_USER: UserInfo = {
  name: "管理员",
  email: "admin@starter.local",
  roleLabel: "超级管理员",
};

const THEME_OPTIONS: { value: MantineColorScheme; label: string; icon: typeof IconSun }[] = [
  { value: "light", label: "浅色", icon: IconSun },
  { value: "dark", label: "深色", icon: IconMoon },
  { value: "auto", label: "跟随系统", icon: IconDeviceDesktop },
];

/** 菜单中的用户信息：点击展开面板（主题 / 设置 / 退出登录），三种形态覆盖四种菜单模式 */
export const UserMenu = ({
  variant = "sidebar",
  user = DEMO_USER,
  settingsTo = "/settings",
  onLogout,
  extraItems,
}: UserMenuProps) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const compact = variant === "header";
  const initial = user.name.slice(0, 1);

  return (
    <Menu width={240} position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <UnstyledButton className={classes[variant]} aria-label={`用户菜单：${user.name}`}>
          <Group gap="sm" wrap="nowrap">
            <Avatar size={compact ? "sm" : "md"} radius="xl" color="blue">
              {initial}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {user.name}
              </Text>
              {!compact && (
                <Text size="xs" c="dimmed" truncate>
                  {user.email}
                </Text>
              )}
            </div>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <div className={classes.dropdownHeader}>
          <Group gap="sm" wrap="nowrap">
            <Avatar radius="xl" color="blue">
              {initial}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Text size="sm" fw={600}>
                {user.name}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {user.email}
              </Text>
              {user.roleLabel && (
                <Text size="xs" c="blue">
                  {user.roleLabel}
                </Text>
              )}
            </div>
          </Group>
        </div>

        <Menu.Divider />

        {extraItems}

        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item leftSection={<IconPalette size={14} />}>主题设置</Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Menu.Item
                key={value}
                leftSection={<Icon size={14} />}
                rightSection={colorScheme === value ? <IconCheck size={14} /> : null}
                onClick={() => setColorScheme(value)}
              >
                {label}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>

        <Menu.Item
          component={Link}
          to={settingsTo}
          leftSection={<IconSettings size={14} />}
        >
          设置
        </Menu.Item>

        <Menu.Divider />

        {/* 认证未接入时禁用，避免出现点了没反应的死按钮 */}
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={14} />}
          disabled={!onLogout}
          onClick={onLogout}
        >
          {onLogout ? "退出登录" : "退出登录（待接入认证）"}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
