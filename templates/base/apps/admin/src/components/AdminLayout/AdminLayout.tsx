import { IconArrowsExchange } from "@tabler/icons-react";
import { ActionIcon, Tooltip } from "@mantine/core";
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
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* 侧栏固定宽度，不折叠 */}
          <div
            style={{
              width: 260,
              flexShrink: 0,
              borderRight: "1px solid var(--mantine-color-gray-3)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                {layout === "nested" ? <NavbarNested /> : <DoubleNavbar />}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: "var(--mantine-spacing-md)" }}>
            <Outlet />
          </div>
        </div>
      )}
    </>
  );
};
