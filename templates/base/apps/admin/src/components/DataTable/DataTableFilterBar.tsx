import { IconChevronDown, IconRotate, IconSearch, IconX } from "@tabler/icons-react";
import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useDataTableApi } from "./DataTable";
import type { DataTableApi } from "./useDataTable";
import type { FilterField, FilterValues, FilterValue } from "./types";

export interface DataTableFilterBarProps<TRow> {
  table?: DataTableApi<TRow>;
}

/** 把筛选值转成显示文案（下拉选项取 label，找不到则回退值本身） */
const valueLabel = (field: FilterField, value: string): string =>
  field.options?.find((option) => option.value === value)?.label ?? value;

/** 只取 more 字段的已提交值，作为浮层草稿的快照 */
const snapshotMore = (filters: FilterValues, moreFields: FilterField[]): FilterValues => {
  const draft: FilterValues = {};
  moreFields.forEach((field) => {
    draft[field.key] = filters[field.key] ?? null;
  });
  return draft;
};

/** 筛选栏：搜索框 + inline 条件常驻，more 条件收进带草稿态的浮层 */
export const DataTableFilterBar = <TRow,>({ table: propTable }: DataTableFilterBarProps<TRow>) => {
  const {
    keyword,
    setKeyword,
    filters,
    setFilter,
    applyFilters,
    submitSearch,
    resetFilters,
    labels,
    filterFields,
  } = useDataTableApi<TRow>(propTable);

  // 搜索改为提交式：输入只改草稿，点「搜索」/回车才提交并刷新
  const [searchDraft, setSearchDraft] = useState(keyword);
  useEffect(() => setSearchDraft(keyword), [keyword]);
  const runSearch = () => {
    if (searchDraft !== keyword) setKeyword(searchDraft);
    else submitSearch();
  };

  const [opened, { open, close }] = useDisclosure(false);
  const [draft, setDraft] = useState<FilterValues>({});

  const inlineFields = filterFields.filter((f) => (f.placement ?? "inline") === "inline");
  const moreFields = filterFields.filter((f) => f.placement === "more");

  // 已生效（已提交）的 more 条件 → 芯片；草稿未应用时不影响这里
  const activeChips = moreFields.filter(
    (field) => filters[field.key] != null && filters[field.key] !== "",
  );
  const moreCount = activeChips.length;

  const onOpen = () => {
    setDraft(snapshotMore(filters, moreFields));
    open();
  };

  const onDraftChange = (key: string, value: FilterValue) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const onApply = () => {
    applyFilters(draft); // 一次性提交，服务端模式只拉一次
    close();
  };

  const onCancel = () => close(); // 丢弃草稿

  const renderInlineSelect = (field: FilterField) => (
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
  );

  const renderDraftSelect = (field: FilterField) => (
    <Select
      key={field.key}
      placeholder={field.label}
      data={[
        { value: "", label: field.allLabel ?? field.label },
        ...(field.options ?? []),
      ]}
      value={draft[field.key] != null ? String(draft[field.key]) : null}
      onChange={(value) => onDraftChange(field.key, value === null || value === "" ? null : value)}
      w="100%"
      aria-label={field.label}
      comboboxProps={{ withinPortal: false }} // 嵌套浮层规则，否则点外面会关掉两层
    />
  );

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {/* 搜索框 + inline 条件：占满剩余宽度，即时生效 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <TextInput
            placeholder={labels.searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.currentTarget.value)}
            onKeyDown={(event) => event.key === "Enter" && runSearch()}
            style={{ flex: "1 1 200px", minWidth: 160 }}
            aria-label={labels.searchPlaceholder}
          />
          {inlineFields.map(renderInlineSelect)}
        </div>

        {/* 操作按钮靠右 */}
        <Group gap="xs" wrap="nowrap">
          {moreFields.length > 0 && (
            <Popover
              position="bottom-end"
              width={280}
              withArrow
              shadow="md"
              withinPortal={false}
              opened={opened}
              onChange={close}
            >
              <Popover.Target>
                <Button
                  variant="default"
                  rightSection={<IconChevronDown size={14} />}
                  onClick={onOpen}
                >
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
                  {moreFields.map(renderDraftSelect)}
                  <Divider />
                  <Group justify="flex-end" gap="xs">
                    <Button variant="subtle" size="xs" onClick={onCancel}>
                      {labels.cancelFilters}
                    </Button>
                    <Button size="xs" onClick={onApply}>
                      {labels.applyFilters}
                    </Button>
                  </Group>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
          <Button variant="default" leftSection={<IconRotate size={16} />} onClick={resetFilters}>
            {labels.reset}
          </Button>
          <Button leftSection={<IconSearch size={16} />} onClick={runSearch}>
            {labels.search}
          </Button>
        </Group>
      </Group>

      {/* 已提交的 more 条件芯片：可单独清除 */}
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
