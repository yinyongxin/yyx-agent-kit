import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";
import { Checkbox, Table, UnstyledButton } from "@mantine/core";
import { useDataTableApi } from "./DataTable";
import type { DataTableApi } from "./useDataTable";
import type { SortDirection } from "./types";

export interface DataTableTableProps<TRow> {
  table?: DataTableApi<TRow>;
}

/** 排序三态对应的图标：升序 / 降序 / 未排序 */
const sortIcon = (active: boolean, direction: SortDirection) => {
  if (!active || direction === null) return IconSelector;
  return direction === "asc" ? IconChevronUp : IconChevronDown;
};

/**
 * 桌面表格视图：列定义驱动，sticky 表头，行选择。
 *
 * 职责边界：只负责「怎么显示」——行数据来自实例（rows）、列结构来自列定义（columns），
 * 过滤/排序/分页/选中的状态与动作都在 useDataTable 里，本组件不持有业务状态。
 */
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
    selectable,
  } = useDataTableApi<TRow>(propTable);

  const visibleColumns = columns.filter((column) => !column.hidden);

  return (
    <Table.ScrollContainer
      minWidth={980}
      maxHeight={520}
      // 自定义滚动条是覆盖层、不占布局宽度；关掉 offset 补偿，
      // 否则滚动条出现时 viewport 会被加右/下 padding，导致表格与页面对不齐
      scrollAreaProps={{ offsetScrollbars: false }}
    >
      <Table
        stickyHeader
        highlightOnHover
        withTableBorder
      >
        <Table.Thead>
          <Table.Tr>
            {/* 首列固定放全选：全选/取消当前页，部分选中时显示半选态；无批量操作时整列隐藏 */}
            {selectable && (
              <Table.Th w={44}>
                <Checkbox
                  aria-label={somePageSelected ? "取消全选当前页" : "全选当前页"}
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={(event) => toggleAll(event.currentTarget.checked)}
                />
              </Table.Th>
            )}
            {visibleColumns.map((column) => {
              const active = sortKey === column.key;
              const Icon = sortIcon(active, sortDirection);
              return (
                <Table.Th
                  key={column.key}
                  w={column.width}
                  // 列头强制不换行：否则窄列（如「状态」）标题会被挤成两行
                  style={{ whiteSpace: "nowrap" }}
                >
                  {column.sortable ? (
                    // 用可聚焦的按钮而非隐藏的 Checkbox：键盘用户也能触发排序
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
                // 选中行高亮：用主题变量而非硬编码颜色，适配明暗主题
                bg={isSelected(key) ? "var(--mantine-color-blue-light)" : undefined}
              >
                {/* 行选择列：aria-label 带主键，便于读屏区分不同行；无批量操作时隐藏 */}
                {selectable && (
                  <Table.Td>
                    <Checkbox
                      aria-label={`选择行 ${String(key)}`}
                      checked={isSelected(key)}
                      onChange={() => toggleRow(key)}
                    />
                  </Table.Td>
                )}
                {/* 数据列：业务可传 render 自定义单元格（Badge/Avatar 等）；
                    没传则取对应字段值，null/undefined 显示为空字符串 */}
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
