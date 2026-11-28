import { Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { AdminScrollArea } from "@/components/AdminScrollArea";
import { LayoutModeProvider, type AdminLayoutMode } from "@/components/LayoutMode";
import { HeaderMegaMenu } from "@/components/header/HeaderMegaMenu";
import { DoubleNavbar } from "@/components/navbar/DoubleNavbar";
import { NavbarNested } from "@/components/navbar/NavbarNested";
import { MeProvider } from "@/lib/me";
import { GlobalTenantPermissions, TenantProvider } from "@/lib/tenant";

export const AdminLayout = () => {
  const location = useLocation();
  const [mode, setMode] = useState<AdminLayoutMode>("nested");

  // 登录页使用独立布局，不显示侧边栏/顶栏
  if (location.pathname === "/login") {
    return <Outlet />;
  }

  const isHeader = mode === "header-mega-menu";

  return (
    <MeProvider>
      <TenantProvider>
        <GlobalTenantPermissions>
          <LayoutModeProvider mode={mode} setMode={setMode}>
            {isHeader ? (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          <HeaderMegaMenu />
          <AdminScrollArea style={{ flex: 1, minHeight: 0 }}>
            <div style={{ padding: "var(--mantine-spacing-md)" }}>
              <Outlet />
            </div>
          </AdminScrollArea>
        </div>
      ) : (
        <div style={{ display: "flex", height: "100vh" }}>
          {/* 侧栏固定宽度，不折叠；背景为白色/深色，主内容区另有浅灰/更深背景以区分 */}
          {/* 宽度由各导航组件自己决定：单栏 260；双栏 = 图标栏 60 + 二级菜单 240 */}
          {/* 分隔线也由组件的 .navbar 画（light-dark 自适应），这里不重复 */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                {mode === "nested" ? <NavbarNested /> : <DoubleNavbar />}
              </div>
            </div>
          </div>

          <AdminScrollArea h="100%" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: "var(--mantine-spacing-md)" }}>
              <Outlet />
            </div>
          </AdminScrollArea>
        </div>
            )}
          </LayoutModeProvider>
        </GlobalTenantPermissions>
      </TenantProvider>
    </MeProvider>
  );
};
