import { ActionBar, Button, Group, Modal, Text } from "@mantine/core";
import { useState } from "react";
import { useDataTableContext } from "./DataTable";
import type { DataTableBatchAction, RowKey } from "./types";

export interface DataTableBatchBarProps {
  actions: DataTableBatchAction[];
}

/**
 * 批量操作条：底座负责选中态、确认弹窗与清空选中；
 * 业务只提供动作清单（含真正改数据的 run），不必自己拼 ActionBar + Modal。
 */
export const DataTableBatchBar = <TRow,>({ actions }: DataTableBatchBarProps) => {
  const { selected, clearSelection, labels } = useDataTableContext<TRow>();
  const [pending, setPending] = useState<{
    action: DataTableBatchAction;
    keys: RowKey[];
  } | null>(null);

  const execute = (action: DataTableBatchAction, keys: RowKey[]) => {
    action.run(keys);
    clearSelection();
  };

  const onAction = (action: DataTableBatchAction) => {
    const keys = [...selected];
    if (action.confirm) setPending({ action, keys });
    else execute(action, keys);
  };

  return (
    <>
      <ActionBar
        opened={selected.size > 0}
        onClose={clearSelection}
        aria-label={labels.batchTitle}
      >
        <Group gap="xs">
          <Text size="sm">{labels.selectedCount(selected.size)}</Text>
          {actions.map((action) => (
            <Button
              key={action.key}
              size="xs"
              color={action.color}
              variant={action.variant ?? "light"}
              leftSection={action.icon}
              onClick={() => onAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </Group>
      </ActionBar>

      <Modal
        opened={pending !== null}
        onClose={() => setPending(null)}
        title={labels.batchTitle}
        centered
      >
        <Text size="sm">{pending?.action.confirm?.(pending.keys.length)}</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="subtle" onClick={() => setPending(null)}>
            {labels.cancel}
          </Button>
          <Button
            color={pending?.action.color}
            onClick={() => {
              if (pending) execute(pending.action, pending.keys);
              setPending(null);
            }}
          >
            {labels.confirm}
          </Button>
        </Group>
      </Modal>
    </>
  );
};
