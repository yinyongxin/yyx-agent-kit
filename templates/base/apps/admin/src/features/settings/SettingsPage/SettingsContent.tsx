import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  meControllerChangePassword,
  meControllerUpdate,
} from "@starter/api/generated";
import { getApiErrorMessage } from "@/lib/api-error";
import { useMe } from "@/lib/me";
import { SessionsCard } from "./SessionsCard";

/** 账号设置：个人资料 + 修改密码（任何登录用户可用） */
export const SettingsContent = () => {
  const { me, loading, error: meError, refresh } = useMe();

  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (me?.displayName) setDisplayName(me.displayName);
  }, [me?.displayName]);

  const saveProfile = async () => {
    const name = displayName.trim();
    if (!name) {
      setProfileError("显示名不能为空");
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const res = await meControllerUpdate({ body: { displayName: name } });
      if (res.error || !res.data) {
        setProfileError(getApiErrorMessage(res.error, "保存失败"));
        return;
      }
      setProfileSaved(true);
      refresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("新密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await meControllerChangePassword({
        body: {
          currentPassword,
          newPassword,
        },
      });
      if (res.error) {
        setPasswordError(getApiErrorMessage(res.error, "修改密码失败"));
        return;
      }
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "修改密码失败");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <Text c="dimmed" size="sm">
        加载账号信息…
      </Text>
    );
  }
  if (meError || !me) {
    return <Alert color="red">{meError ?? "账号信息不可用"}</Alert>;
  }

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>个人资料</Title>
            <Badge variant="light" color={me.isPlatformAdmin ? "blue" : "gray"}>
              {me.isPlatformAdmin ? "平台管理员" : "普通成员"}
            </Badge>
          </Group>

          {profileError && <Alert color="red">{profileError}</Alert>}
          {profileSaved && <Alert color="green">资料已保存</Alert>}

          <TextInput label="邮箱" value={me.email ?? ""} disabled />
          <TextInput
            label="显示名"
            value={displayName}
            maxLength={100}
            onChange={(e) => setDisplayName(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button onClick={() => void saveProfile()} loading={profileSaving}>
              保存资料
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder padding="lg">
        <Stack gap="md">
          <Title order={4}>修改密码</Title>

          {passwordError && <Alert color="red">{passwordError}</Alert>}
          {passwordSaved && (
            <Alert color="green">密码已修改，所有登录已失效，请重新登录</Alert>
          )}

          <PasswordInput
            label="当前密码"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="新密码"
            description="至少 8 位"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="确认新密码"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button onClick={() => void changePassword()} loading={passwordSaving}>
              修改密码
            </Button>
          </Group>
        </Stack>
      </Card>
    </SimpleGrid>
      <SessionsCard />
    </Stack>
  );
};
