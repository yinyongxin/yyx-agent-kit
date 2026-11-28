import { Select } from "@mantine/core";
import { useLocation } from "@tanstack/react-router";
import { useTenant } from "@/lib/tenant";

type TenantSwitcherProps = {
  /** 单栏导航里显示「当前租户」标签；双栏空间小，不显示 */
  withLabel?: boolean;
};

/**
 * 全局当前租户切换器。
 *
 * 数据来自 TenantProvider（`/me/tenants`），切换后持久化并触发全局权限重载。
 * 租户成员页的租户来自路由参数，切换器在该页隐藏，避免与路由租户不一致。
 */
export const TenantSwitcher = ({ withLabel = false }: TenantSwitcherProps) => {
  const { tenants, tenantId, setTenantId, loading } = useTenant();
  const { pathname } = useLocation();

  if (loading || !tenantId || tenants.length === 0) return null;
  if (pathname.startsWith("/access/tenant-members/")) return null;

  return (
    <Select
      label={withLabel ? "当前租户" : undefined}
      aria-label="当前租户"
      data={tenants.map((tenant) => ({
        value: tenant.id,
        label: `${tenant.name}（${tenant.slug}）`,
      }))}
      value={tenantId}
      onChange={(value) => {
        if (value) setTenantId(value);
      }}
      allowDeselect={false}
      searchable
      size="xs"
      w="100%"
      mt={withLabel ? "sm" : 0}
      comboboxProps={{ withinPortal: true }}
      nothingFoundMessage="没有匹配的租户"
    />
  );
};
