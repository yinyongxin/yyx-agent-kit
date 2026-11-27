import { IconChevronDown, IconRotate, IconSearch, IconX } from "@tabler/icons-react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDataTableApi } from "./DataTable";
import type { DataTableApi } from "./useDataTable";
import type { FilterField } from "./types";

export interface DataTableFilterBarProps<TRow> {
  table?: DataTableApi<TRow>;
}

/** 把筛选值转成显示文案（下拉选项取 label，找不到则回退值本身） */
const valueLabel = (field: FilterField, value: string): string =>
  field.options?.find((option) => option.value === value)?.label ?? value;

/** 筛选栏：搜索框 + inline 条件常驻，more 条件收进浮层，已选显示芯片 */
export const DataTableFilterBar = <TRow,>({ table: propTable }: DataTableFilterBarProps<TRow>) => {
  const {
    keyword,
    setKeyword,
    filters,
    setFilter,
    submitSearch,
    resetFilters,
    labels,
    filterFields,
  } = useDataTableApi<TRow>(propTable);

  const inlineFields = filterFields.filter((f) => (f.placement ?? "inline") === "inline");
  const moreFields = filterFields.filter((f) => f.placement === "more");

  // 已生效的 more 条件 → 芯片（可单独清除）
  const activeChips = moreFields.filter(
    (field) => filters[field.key] != null && filters[field.key] !== "",
  );
  const moreCount = activeChips.length;

  const renderSelect = (field: FilterField, w?: string | number) => (
    <Select
      key={field.key}
      placeholder={field.label}
      data={[
        { value: "", label: field.allLabel ?? field.label },
        ...(field.options ?? []),
      ]}
      value={filters[field.key] != null ? String(filters[field.key]) : null}
      onChange={(value) => setFilter(field.key, value === null || value === "" ? null : value)}
      w={w ?? 160}
      aria-label={field.label}
      {...(moreFields.includes(field) ? { comboboxProps: { withinPortal: false } } : {})}
    />
  );

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {/* 搜索框 + inline 条件：占满剩余宽度 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <TextInput
            placeholder={labels.searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
            onKeyDown={(event) => event.key === "Enter" && submitSearch()}
            style={{ flex: "1 1 200px", minWidth: 160 }}
            aria-label={labels.searchPlaceholder}
          />
          {inlineFields.map((field) => renderSelect(field))}
        </div>

        {/* 操作按钮靠右 */}
        <Group gap="xs" wrap="nowrap">
          {moreFields.length > 0 && (
            <Popover position="bottom-end" width={280} withArrow shadow="md" withinPortal={false}>
              <Popover.Target>
                <Button variant="default" rightSection={<IconChevronDown size={14} />}>
                  {labels.moreFilters}
                  {moreCount > 0 && (
                    <Badge ml={6} size="xs" variant="light" color="blue">
                      {moreCount}
                    </Badge>
                  )}
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    {labels.moreFilters}
                  </Text>
                  {moreFields.map((field) => renderSelect(field, "100%"))}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
          <Button variant="default" leftSection={<IconRotate size={16} />} onClick={resetFilters}>
            {labels.reset}
          </Button>
          <Button leftSection={<IconSearch size={16} />} onClick={submitSearch}>
            {labels.search}
          </Button>
        </Group>
      </Group>

      {/* 已选 more 条件芯片：可单独清除 */}
      {activeChips.length > 0 && (
        <Group gap="xs" wrap="wrap">
          {activeChips.map((field) => (
            <Badge
              key={field.key}
              variant="light"
              color="blue"
              rightSection={
                <Tooltip label={labels.clearFilter(field.label)}>
                  <ActionIcon
                    size={16}
                    variant="transparent"
                    color="blue"
                    aria-label={labels.clearFilter(field.label)}
                    onClick={() => setFilter(field.key, null)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              {field.label}：{valueLabel(field, String(filters[field.key]))}
            </Badge>
          ))}
        </Group>
      )}
    </Stack>
  );
};
