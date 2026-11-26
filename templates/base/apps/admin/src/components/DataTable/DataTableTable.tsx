import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";
import { Checkbox, Table, UnstyledButton } from "@mantine/core";
import { useDataTableApi } from "./DataTable";
import type { DataTableApi } from "./useDataTable";

export interface DataTableTableProps<TRow> {
  table?: DataTableApi<TRow>;
}

/** 桌面表格视图：列定义驱动，sticky 表头，行选择 */
export const DataTableTable = <TRow,>({ table: propTable }: DataTableTableProps<TRow>) => {
  const {
    rows,
    columns,
    getRowKey,
    sortKey,
    sortDirection,
    toggleSort,
    toggleRow,
    toggleAll,
    isSelected,
    allPageSelected,
    somePageSelected,
  } = useDataTableApi<TRow>(propTable);

  return (
    <Table.ScrollContainer
      minWidth={980}
      maxHeight={520}
      scrollAreaProps={{ offsetScrollbars: true }}
    >
      <Table stickyHeader highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={44}>
              <Checkbox
                aria-label="全选当前页"
                checked={allPageSelected}
                indeterminate={somePageSelected}
                onChange={(event) => toggleAll(event.currentTarget.checked)}
              />
            </Table.Th>
            {columns.map((column) => {
              const active = sortKey === column.key;
              const Icon = active
                ? sortDirection === "asc"
                  ? IconChevronUp
                  : IconChevronDown
                : IconSelector;
              return (
                <Table.Th key={column.key} w={column.width} style={{ whiteSpace: "nowrap" }}>
                  {column.sortable ? (
                    <UnstyledButton
                      onClick={() => toggleSort(column.key)}
                      aria-label={`按${String(column.title)}排序`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {column.title}
                      <Icon size={14} />
                    </UnstyledButton>
                  ) : (
                    column.title
                  )}
                </Table.Th>
              );
            })}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const key = getRowKey(row);
            return (
              <Table.Tr
                key={key}
                bg={isSelected(key) ? "var(--mantine-color-blue-light)" : undefined}
              >
                <Table.Td>
                  <Checkbox
                    aria-label={`选择行 ${String(key)}`}
                    checked={isSelected(key)}
                    onChange={() => toggleRow(key)}
                  />
                </Table.Td>
                {columns.map((column) => (
                  <Table.Td key={column.key}>
                    {column.render
                      ? column.render(row)
                      : String(row[column.key] ?? "")}
                  </Table.Td>
                ))}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
