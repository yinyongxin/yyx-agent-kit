import { IconRotate, IconSearch } from "@tabler/icons-react";
import { Button, Group, Select, TextInput } from "@mantine/core";
import { useDataTableContext } from "./DataTable";

/** 筛选栏：搜索 + 配置化下拉筛选 + 重置（借鉴 data-list 的受控筛选） */
export const DataTableFilterBar = <TRow,>() => {
  const {
    keyword,
    setKeyword,
    filters,
    setFilter,
    resetFilters,
    labels,
    filterFields,
  } = useDataTableContext<TRow>();

  const selects = filterFields.filter((field) => field.type === "select");

  return (
    <Group gap="xs" wrap="wrap" mb="md">
      <TextInput
        placeholder={labels.searchPlaceholder}
        leftSection={<IconSearch size={16} />}
        value={keyword}
        onChange={(event) => setKeyword(event.currentTarget.value)}
        w={260}
        aria-label={labels.searchPlaceholder}
      />
      {selects.map((field) => (
        <Select
          key={field.key}
          placeholder={field.label}
          data={[
            { value: "", label: field.allLabel ?? field.label },
            ...(field.options ?? []),
          ]}
          value={filters[field.key] != null ? String(filters[field.key]) : null}
          onChange={(value) => setFilter(field.key, value === null || value === "" ? null : value)}
          w={160}
          aria-label={field.label}
        />
      ))}
      <Button variant="subtle" leftSection={<IconRotate size={16} />} onClick={resetFilters}>
        {labels.reset}
      </Button>
    </Group>
  );
};
