import { useEffect, useState } from "react";
import { Alert, Select, Stack, Text } from "@mantine/core";
import { meControllerTenants, type TenantSummaryDto } from "@starter/api/generated";
import { getApiErrorMessage } from "@/lib/api-error";
import { RolesTable } from "./RolesTable";

/**
 * 角色页入口：角色是租户内资源，先选租户，再渲染该租户的角色表格。
 * 用 key={tenantId} 重置表格状态，避免切租户后残留页码 / 搜索词。
 */
export const RolesContent = () => {
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void meControllerTenants().then((res) => {
      if (!alive) return;
      if (res.error || !res.data) {
        setError(getApiErrorMessage(res.error, "加载租户失败"));
        return;
      }
      setTenants(res.data);
      const preferred = res.data.find((tenant) => tenant.slug === "default") ?? res.data[0];
      setTenantId(preferred?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <Alert color="red">{error}</Alert>;
  if (!tenantId) {
    return (
      <Text c="dimmed" size="sm">
        加载租户中…
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Select
        label="租户"
        description="角色属于租户；切换租户会加载该租户的角色"
        data={tenants.map((tenant) => ({
          value: tenant.id,
          label: `${tenant.name}（${tenant.slug}）`,
        }))}
        value={tenantId}
        onChange={(value) => {
          if (value) setTenantId(value);
        }}
        allowDeselect={false}
        w={360}
      />
      <RolesTable key={tenantId} tenantId={tenantId} />
    </Stack>
  );
};
