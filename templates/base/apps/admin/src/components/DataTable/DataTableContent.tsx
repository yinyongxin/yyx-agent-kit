import { Alert, Button, EmptyState, Skeleton, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { useDataTableApi } from "./DataTable";
import type { DataTableApi } from "./useDataTable";

export interface DataTableContentProps<TRow> {
  table?: DataTableApi<TRow>;
  /** 成功态渲染的内容（表格或卡片），可传函数拿实例 */
  children: ReactNode | ((table: DataTableApi<TRow>) => ReactNode);
}

/** 四态切换：loading / success / empty / error，同一时刻只显示一种 */
export const DataTableContent = <TRow,>({ table: propTable, children }: DataTableContentProps<TRow>) => {
  const table = useDataTableApi<TRow>(propTable);
  const { state, labels, onRetry, onEmptyAction, errorMessage } = table;

  if (state === "loading") {
    return (
      <Stack gap="xs">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} height={36} radius="sm" />
        ))}
      </Stack>
    );
  }

  if (state === "error") {
    return (
      <Alert color="red" title={labels.errorTitle}>
        <Stack gap="xs" align="flex-start">
          <span>{errorMessage ?? labels.errorDescription}</span>
          {onRetry && (
            <Button size="xs" variant="light" onClick={onRetry}>
              {labels.retry}
            </Button>
          )}
        </Stack>
      </Alert>
    );
  }

  if (state === "empty") {
    return (
      <Stack align="center" gap="sm">
        <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
        {onEmptyAction && (
          <Button variant="light" size="sm" onClick={onEmptyAction}>
            {labels.create}
          </Button>
        )}
      </Stack>
    );
  }

  return <>{typeof children === "function" ? children(table) : children}</>;
};
