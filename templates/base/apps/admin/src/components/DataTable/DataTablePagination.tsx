import { Group, Pagination, Select, Text } from "@mantine/core";
import { useDataTableContext } from "./DataTable";

/** 分页：页数读 Context 单一来源，杜绝死按钮 */
export const DataTablePagination = <TRow,>() => {
  const {
    page,
    pages,
    pageSize,
    setPage,
    setPageSize,
    total,
    paginationLabels,
  } = useDataTableContext<TRow>();

  return (
    <Group justify="space-between" mt="md" wrap="wrap">
      <Group gap="xs">
        <Text size="sm" c="dimmed">
          {paginationLabels.total(total)}
        </Text>
        <Select
          data={[
            { value: "10", label: "10" },
            { value: "20", label: "20" },
            { value: "50", label: "50" },
          ]}
          value={String(pageSize)}
          onChange={(value) => value && setPageSize(Number(value))}
          w={80}
          aria-label={paginationLabels.pageSize}
        />
      </Group>
      <Pagination total={pages} value={page} onChange={setPage} size="sm" />
    </Group>
  );
};
