import { Checkbox, SimpleGrid, Paper, Group, Text } from "@mantine/core";
import { useDataTableContext } from "./DataTable";

/** 移动卡片视图：一份列配置两套 DOM（借鉴 data-list 双视图，CSS 断点切换） */
export const DataTableCardList = <TRow,>() => {
  const { rows, columns, getRowKey, isSelected, toggleRow } =
    useDataTableContext<TRow>();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" hiddenFrom="sm">
      {rows.map((row) => {
        const key = getRowKey(row);
        return (
          <Paper
            key={key}
            withBorder
            p="sm"
            bg={isSelected(key) ? "var(--mantine-color-blue-light)" : undefined}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={600}>{String(row[columns[0]?.key as keyof TRow] ?? "")}</Text>
              <Checkbox
                aria-label={`选择行 ${String(key)}`}
                checked={isSelected(key)}
                onChange={() => toggleRow(key)}
              />
            </Group>
            {columns.slice(1).map((column) => (
              <Group key={column.key} justify="space-between" gap="xs" mb={4}>
                <Text size="sm" c="dimmed">
                  {column.title}
                </Text>
                <Text size="sm">
                  {column.render ? column.render(row) : String(row[column.key] ?? "")}
                </Text>
              </Group>
            ))}
          </Paper>
        );
      })}
    </SimpleGrid>
  );
};
