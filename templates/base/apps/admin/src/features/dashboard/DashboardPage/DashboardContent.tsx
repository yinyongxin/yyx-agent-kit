import { Alert, Badge, Loader, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";

const api = createApiClient();

/** 工作台内容：后端运行状态（公开接口）。后续基础服务接入后在这里扩展功能卡片。 */
export const DashboardContent = () => {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .health()
      .then((result) => {
        setHealth(result);
        setError(null);
      })
      .catch((reason: unknown) => setError(String(reason)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Title order={3} size="h5">
        运行状态
      </Title>
      {loading && <Loader size="sm" mt="sm" />}
      {error && (
        <Alert color="red" title="错误" mt="sm">
          {error}
        </Alert>
      )}
      {!loading && !error && health && (
        <Badge color={health.status === "ok" ? "green" : "red"} mt="sm">
          {health.status === "ok" ? "服务正常" : health.status}
        </Badge>
      )}
    </>
  );
};
