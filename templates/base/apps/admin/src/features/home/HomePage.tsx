import { Alert, Badge, Loader, Paper, Stack, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";

const api = createApiClient();

export const HomePage = () => {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.health()
      .then((h) => {
        setHealth(h);
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="md">
      <Title order={2}>首页</Title>
      <Paper withBorder p="md">
        <Title order={3} size="h5">
          后端连通状态
        </Title>
        {loading && <Loader size="sm" className="mt-2" />}
        {error && (
          <Alert color="red" title="错误" className="mt-2">
            {error}
          </Alert>
        )}
        {!loading && !error && health && (
          <Badge color={health.status === "ok" ? "green" : "red"} className="mt-2">
            {health.status === "ok" ? "已连接" : health.status}
          </Badge>
        )}
      </Paper>
    </Stack>
  );
};
