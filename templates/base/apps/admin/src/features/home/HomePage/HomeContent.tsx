import { Alert, Badge, Loader, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";

const api = createApiClient();

/** 首页内容：后端连通状态（可复用）。 */
export const HomeContent = () => {
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
    <>
      <Title order={3} size="h5">
        后端连通状态
      </Title>
      {loading && <Loader size="sm" mt="sm" />}
      {error && (
        <Alert color="red" title="错误" mt="sm">
          {error}
        </Alert>
      )}
      {!loading && !error && health && (
        <Badge color={health.status === "ok" ? "green" : "red"} mt="sm">
          {health.status === "ok" ? "已连接" : health.status}
        </Badge>
      )}
    </>
  );
};
