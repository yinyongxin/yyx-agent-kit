import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import {
  authControllerSignIn,
  client,
  meControllerTenants,
  tenantControllerMembership,
  tenantControllerRoles,
  type MembershipDto,
  type RoleDto,
  type TenantSummaryDto,
} from "@starter/api/generated";

// 生成路径已含 /api，baseUrl 留空走 Vite 代理（/api → localhost:47100）
client.setConfig({ baseUrl: "" });

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const IntegrationContent = () => {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("seed_pwd_2026");
  const [token, setToken] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);
  const [membership, setMembership] = useState<MembershipDto | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  const signIn = () =>
    run(async () => {
      const res = await authControllerSignIn({ body: { email, password } });
      const accessToken = res.data?.accessToken;
      if (!accessToken) {
        setError("登录失败：邮箱或密码不正确");
        setStatus(null);
        return;
      }
      setToken(accessToken);
      setStatus(`登录成功，token 长度 ${accessToken.length}`);
      setMembership(null);
      setRoles([]);

      const me = await meControllerTenants({ headers: authHeaders(accessToken) });
      setTenants(me.data ?? []);
    });

  const selectTenant = (tenantId: string) =>
    run(async () => {
      if (!token) return;
      const [m, r] = await Promise.all([
        tenantControllerMembership({
          path: { tenantId },
          headers: authHeaders(token),
        }),
        tenantControllerRoles({
          path: { tenantId },
          headers: authHeaders(token),
        }),
      ]);
      setMembership(m.data ?? null);
      setRoles(r.data ?? []);
    });

  return (
    <Stack gap="md">
      <Card withBorder padding="lg">
        <Stack gap="sm" maw={420}>
          <Title order={4}>登录（POST /api/auth/sign-in）</Title>
          <TextInput
            label="邮箱"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label="密码"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Group>
            <Button onClick={signIn} loading={loading}>
              登录并加载租户
            </Button>
            {token && <Badge color="green">已登录</Badge>}
          </Group>
          {status && <Text size="sm">{status}</Text>}
          {error && <Alert color="red">{error}</Alert>}
        </Stack>
      </Card>

      {tenants.length > 0 && (
        <Card withBorder padding="lg">
          <Title order={4} mb="sm">
            我的租户（GET /api/me/tenants）
          </Title>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>名称</Table.Th>
                <Table.Th>slug</Table.Th>
                <Table.Th>加入时间</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tenants.map((tenant) => (
                <Table.Tr key={tenant.id}>
                  <Table.Td>{tenant.name}</Table.Td>
                  <Table.Td>{tenant.slug}</Table.Td>
                  <Table.Td>{new Date(tenant.joinedAt).toLocaleString()}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => selectTenant(tenant.id)}
                    >
                      查看成员
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {membership && (
        <Card withBorder padding="lg">
          <Title order={4} mb="sm">
            当前租户成员（GET /api/t/:tenantId/membership）
          </Title>
          <Group gap="lg">
            <Text size="sm">role：{membership.role}</Text>
            <Text size="sm">status：{membership.status}</Text>
            <Text size="sm">tenantId：{membership.tenantId}</Text>
          </Group>
        </Card>
      )}

      {roles.length > 0 && (
        <Card withBorder padding="lg">
          <Title order={4} mb="sm">
            当前租户角色（GET /api/t/:tenantId/roles）
          </Title>
          <Group gap="sm">
            {roles.map((role) => (
              <Badge key={role.id} variant="light">
                {role.code} · {role.name}
              </Badge>
            ))}
          </Group>
        </Card>
      )}
    </Stack>
  );
};
