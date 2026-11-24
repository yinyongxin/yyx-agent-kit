import { Text } from "@mantine/core";

/**
 * 通用占位内容：放到 PageShell 的 children 里，表示功能建设中。
 * 不是"页面"——页面壳由 PageShell 负责。
 */
export const PlaceholderContent = ({ message }: { message: string }) => (
  <Text c="dimmed">{message}</Text>
);
