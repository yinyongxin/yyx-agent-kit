import {
  Alert,
  Button,
  Card,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authControllerSignIn } from "@starter/api/generated";
import { authStore } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";

export const LoginContent = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("seed_pwd_2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authControllerSignIn({ body: { email, password } });
      if (res.error) {
        setError(getApiErrorMessage(res.error, "登录失败"));
        return;
      }
      const token = res.data?.accessToken;
      if (!token) {
        setError("登录失败：邮箱或密码不正确");
        return;
      }
      authStore.setToken(token);
      authStore.setEmail(email);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder padding="xl" w={420} mx="auto" mt={120}>
      <form onSubmit={submit}>
        <Stack gap="md">
          <Title order={3}>登录</Title>
          <Text size="sm" c="dimmed">
            使用平台管理员账号登录后管理租户
          </Text>
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
          {error && <Alert color="red">{error}</Alert>}
          <Button type="submit" loading={loading}>
            登录
          </Button>
        </Stack>
      </form>
    </Card>
  );
};
