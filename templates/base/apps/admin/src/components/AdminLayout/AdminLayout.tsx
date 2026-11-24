import {
  IconArrowsExchange,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { ActionIcon, Box, Group, Text, Tooltip } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { HeaderMegaMenu } from "../header/HeaderMegaMenu/index";
import { HeaderMenu } from "../header/HeaderMenu/index";
import { DoubleNavbar } from "../navbar/DoubleNavbar/index";
import { NavbarNested } from "../navbar/NavbarNested/index";

type Layout = "nested" | "double" | "header-menu" | "header-mega-menu";

const LAYOUTS: Layout[] = ["nested", "double", "header-menu", "header-mega-menu"];
const LABELS: Record<Layout, string> = {
  nested: "嵌套侧栏",
  double: "双栏侧栏",
  "header-menu": "顶部菜单",
  "header-mega-menu": "顶部大菜单",
};

export const AdminLayout = () => {
  const [layout, setLayout] = useState<Layout>("nested");
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const isMobile = useMediaQuery("(max-width: 48em)");

  const nextLayout = () =>
    setLayout((current) => LAYOUTS[(LAYOUTS.indexOf(current) + 1) % LAYOUTS.length]!);
  const isHeader = layout === "header-menu" || layout === "header-mega-menu";

  return (
    <>
      {/* 浮动切换按钮：四种布局模式通用 */}
      <Tooltip label={`当前：${LABELS[layout]}，点击切换`} position="bottom">
        <ActionIcon
          variant="filled"
          onClick={nextLayout}
          aria-label="切换布局模式"
          style={{ position: "fixed", top: 12, right: 12, zIndex: 2000 }}
        >
          <IconArrowsExchange size={18} />
        </ActionIcon>
      </Tooltip>

      {isHeader ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {layout === "header-menu" ? <HeaderMenu /> : <HeaderMegaMenu />}
          <div style={{ flex: 1, minHeight: 0, padding: "var(--mantine-spacing-md)" }}>
            <Outlet />
          </div>
        </div>
      ) : (
        <>
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
      )}
    </>
  );
};



