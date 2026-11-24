import { NavLink } from "@mantine/core";
import { Link } from "@tanstack/react-router";

const MENU = [
  {
    section: "概览",
    items: [
      { label: "首页", to: "/", icon: "🏠" },
      { label: "工作台", to: "/dashboard", icon: "📊" },
    ],
  },
  {
    section: "权限管理",
    items: [
      { label: "用户", to: "/users", icon: "👥" },
      { label: "角色", to: "/roles", icon: "🎭" },
      { label: "租户", to: "/tenants", icon: "🏢" },
      { label: "权限", to: "/permissions", icon: "🔑" },
    ],
  },
  {
    section: "系统",
    items: [{ label: "设置", to: "/settings", icon: "⚙️" }],
  },
] as const;

export const AdminMenu = () => (
  <div>
    {MENU.map((group) => (
      <div key={group.section} className="mb-4">
        <div className="mb-1 px-3 text-xs font-semibold text-slate-400">{group.section}</div>
        {group.items.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<span>{item.icon}</span>}
          />
        ))}
      </div>
    ))}
  </div>
);
