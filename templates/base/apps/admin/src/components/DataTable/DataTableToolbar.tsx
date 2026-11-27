import { Group } from "@mantine/core";
import type { ReactNode } from "react";

/** 工具栏：放新建 / 导入 / 导出等页面操作按钮（不是筛选栏） */
export const DataTableToolbar = ({ children }: { children?: ReactNode }) => (
  <Group justify="flex-end" gap="xs">
    {children}
  </Group>
);
