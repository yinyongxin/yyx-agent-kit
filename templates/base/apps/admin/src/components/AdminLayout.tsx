import { IconArrowsExchange, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { ActionIcon, Box, Group, Text, Tooltip } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { DoubleNavbar } from "./navbar/DoubleNavbar";
import { NavbarNested } from "./navbar/NavbarNested";

type NavbarLayout = "nested" | "double";

export const AdminLayout = () => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [layout, setLayout] = useState<NavbarLayout>("nested");
  const isMobile = useMediaQuery("(max-width: 48em)");

  const toggleLayout = () =>
    setLayout((current) => (current === "nested" ? "double" : "nested"));

  return (
    <>
      {/* 无 Header：移动端打开菜单的浮动按钮 */}
      <Box hiddenFrom="sm" p="xs">
        <ActionIcon variant="subtle" onClick={toggleMobile} aria-label="打开菜单">
          <IconChevronRight size={18} />
        </ActionIcon>
      </Box>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div
          style={{
            width: desktopOpened ? 260 : 56,
            flexShrink: 0,
            transition: "width 200ms ease",
            borderRight: "1px solid var(--mantine-color-gray-3)",
            display: isMobile && !mobileOpened ? "none" : "block",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            <Group justify="space-between" gap="xs" p="xs" wrap="nowrap">
              {desktopOpened && <Text size="sm" fw={600}>starter</Text>}
              <Group gap={4} ml="auto">
                <Tooltip label={`切换为${layout === "nested" ? "双栏" : "嵌套"}菜单`} position="bottom">
                  <ActionIcon variant="subtle" onClick={toggleLayout} aria-label="切换菜单布局">
                    <IconArrowsExchange size={18} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={desktopOpened ? "收起菜单" : "展开菜单"} position="bottom">
                  <ActionIcon variant="subtle" onClick={toggleDesktop} aria-label="折叠菜单">
                    {desktopOpened ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            <div style={{ flex: 1, minHeight: 0 }}>
              {layout === "nested" ? <NavbarNested /> : <DoubleNavbar />}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: "var(--mantine-spacing-md)" }}>
          <Outlet />
        </div>
      </div>
    </>
  );
};
