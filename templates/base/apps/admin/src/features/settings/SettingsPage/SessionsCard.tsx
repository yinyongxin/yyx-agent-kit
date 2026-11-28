import { useCallback, useEffect, useState } from "react";
import { IconLogout, IconTrash } from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  meSessionsControllerList,
  meSessionsControllerRevoke,
  meSessionsControllerRevokeOthers,
  type SessionResponseDto,
} from "@starter/api/generated";
import { getApiErrorMessage } from "@/lib/api-error";

const formatTime = (value: string) => new Date(value).toLocaleString();

/** 登录设备：列出服务端会话，支持撤销单个 / 退出其他设备 */
export const SessionsCard = () => {
  const [sessions, setSessions] = useState<SessionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await meSessionsControllerList();
      if (res.error || !res.data) {
        setError(getApiErrorMessage(res.error, "加载登录设备失败"));
        return;
      }
      setSessions(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载登录设备失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revokeOthers = async () => {
    if (!window.confirm("确定退出其他设备？当前设备会保留登录。")) return;
    setRevokingOthers(true);
    setActionError(null);
    setSaved(false);
    try {
      const res = await meSessionsControllerRevokeOthers();
      if (res.error) {
        setActionError(getApiErrorMessage(res.error, "退出其他设备失败"));
        return;
      }
      setSaved(true);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "退出其他设备失败");
    } finally {
      setRevokingOthers(false);
    }
  };

  const revoke = async (session: SessionResponseDto) => {
    if (!window.confirm(`确定撤销「${session.device ?? "未知设备"}」的登录？`)) return;
    setBusyId(session.id);
    setActionError(null);
    setSaved(false);
    try {
      const res = await meSessionsControllerRevoke({ path: { id: session.id } });
      if (res.error) {
        setActionError(getApiErrorMessage(res.error, "撤销会话失败"));
        return;
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "撤销会话失败");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={4}>登录设备</Title>
            <Text size="xs" c="dimmed">
              服务端会话；撤销后对应 token 立即失效
            </Text>
          </div>
          <Button
            variant="default"
            leftSection={<IconLogout size={16} />}
            disabled={sessions.length <= 1}
            loading={revokingOthers}
            onClick={() => void revokeOthers()}
          >
            退出其他设备
          </Button>
        </Group>

        {error && <Alert color="red">{error}</Alert>}
        {actionError && <Alert color="red">{actionError}</Alert>}
        {saved && <Alert color="green">已退出其他设备</Alert>}
        {loading && (
          <Text size="sm" c="dimmed">
            加载登录设备…
          </Text>
        )}
        {!loading && sessions.length === 0 && (
          <Text size="sm" c="dimmed">
            暂无登录设备
          </Text>
        )}

        {sessions.map((session) => (
          <Group
            key={session.id}
            justify="space-between"
            wrap="nowrap"
            align="flex-start"
            p="sm"
            style={{ border: "1px solid var(--mantine-color-default-border)", borderRadius: 8 }}
          >
            <div style={{ minWidth: 0 }}>
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  {session.device ?? "未知设备"}
                </Text>
                {session.current && (
                  <Badge size="xs" color="blue" variant="light">
                    当前设备
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                IP {session.ip ?? "未知"} · 最近活动 {formatTime(session.lastActiveAt)}
              </Text>
              <Text size="xs" c="dimmed">
                登录 {formatTime(session.createdAt)} · 到期 {formatTime(session.expiresAt)}
              </Text>
            </div>
            {!session.current && (
              <Tooltip label="撤销该设备">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  loading={busyId === session.id}
                  onClick={() => void revoke(session)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        ))}
      </Stack>
    </Card>
  );
};
