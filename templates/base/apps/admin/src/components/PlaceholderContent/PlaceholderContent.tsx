import { Paper, Text } from "@mantine/core";

/**
 * 通用占位内容：放到 PageShell 的 children 里，表示功能建设中。
 * 视觉表面由内容自己决定——PageShell 只提供位置。
 */
export const PlaceholderContent = ({ message }: { message: string }) => (
  <Paper withBorder p="sm" mih={200}>
    <Text c="dimmed">{message}</Text>
  </Paper>
);
