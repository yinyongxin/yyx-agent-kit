import { Group, Paper, Stack, Text, Title } from "@mantine/core";
import classes from "./PageShell.module.css";
import type { PageShellProps } from "./types";

/**
 * 通用页面壳：统一页面的标题、说明、操作区与内容区布局。
 * 只负责"外壳"，业务内容由 children 传入（如 <UsersContent />），便于内容复用。
 */
export const PageShell = ({
  title,
  description,
  actions,
  children,
}: PageShellProps) => (
  <Stack gap="md">
    <Group justify="space-between" align="flex-end" gap="md">
      <div>
        <Title order={2}>{title}</Title>
        {description && (
          <Text c="dimmed" size="sm" mt={4}>
            {description}
          </Text>
        )}
      </div>
      {actions}
    </Group>
    <Paper withBorder p="md" className={classes.content}>
      {children}
    </Paper>
  </Stack>
);
