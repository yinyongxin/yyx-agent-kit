import { Button, Center, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

/** 统一的 403 内容：放在 PageShell children 里，保持页面标题与导航 */
export const ForbiddenContent = ({ description }: { description?: string }) => {
  const navigate = useNavigate();
  return (
    <Center mih={320}>
      <Paper withBorder p="xl" maw={480} w="100%">
        <Stack align="center" gap="sm">
          <ThemeIcon size={48} radius="xl" color="red" variant="light">
            <IconLock size={26} />
          </ThemeIcon>
          <Title order={4}>无权限访问</Title>
          <Text size="sm" c="dimmed" ta="center">
            {description ??
              "当前账号缺少访问该页面所需的权限，请联系租户管理员调整角色。"}
          </Text>
          <Button variant="default" onClick={() => navigate({ to: "/" })}>
            返回工作台
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
};
