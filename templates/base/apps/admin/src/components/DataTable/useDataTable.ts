import { useCallback, useMemo, useState } from "react";
import {
  derivePages,
  filterRows,
  paginateRows,
  resolveState,
  sortRows,
  toggleKey,
  togglePage,
} from "./functions";
import type {
  ColumnDef,
  DataState,
  DataTableLabels,
  FilterField,
  FilterValue,
  FilterValues,
  PaginationLabels,
  RowKey,
  SortDirection,
} from "./types";

export interface UseDataTableOptions<TRow> {
  /** 本期静态数据；后续接 API 时由 queryOptions 提供 */
  data: TRow[];
  /** 标注行类型靠它推断，调用处不显式写泛型 */
  getRowKey: (row: TRow) => RowKey;
  /** 关键词匹配的字段 */
  keywordFields: (keyof TRow & string)[];
  columns: ColumnDef<TRow>[];
  filterFields: FilterField[];
  labels: DataTableLabels;
  paginationLabels: PaginationLabels;
  onRetry?: () => void;
  onEmptyAction?: () => void;
  initialPageSize?: number;
  initialFilters?: FilterValues;
  /** 可注入；本期静态数据默认 success */
  state?: "loading" | "success" | "error";
  /** 原始数据非空但业务派生后为空时覆盖空态判定 */
  emptyWhen?: (rows: TRow[]) => boolean;
}

export interface UseDataTableResult<TRow> {
  state: DataState;
  /** 过滤排序后的全部行（未分页） */
  allRows: TRow[];
  /** 当前页行 */
  rows: TRow[];
  total: number;
  pages: number;
  page: number;
  pageSize: number;
  keyword: string;
  filters: FilterValues;
  sortKey: (keyof TRow & string) | null;
  sortDirection: SortDirection;
  selected: Set<RowKey>;
  setKeyword: (value: string) => void;
  setFilter: (key: string, value: FilterValue) => void;
  resetFilters: () => void;
  toggleSort: (key: keyof TRow & string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleRow: (key: RowKey) => void;
  toggleAll: (checked: boolean) => void;
  clearSelection: () => void;
  isSelected: (key: RowKey) => boolean;
  allPageSelected: boolean;
  somePageSelected: boolean;
}

/** 完整实例：状态 + 动作 + 视图配置。组件显式接收它，类型从实例推断。 */
export interface DataTableApi<TRow> extends UseDataTableResult<TRow> {
  columns: ColumnDef<TRow>[];
  filterFields: FilterField[];
  labels: DataTableLabels;
  paginationLabels: PaginationLabels;
  getRowKey: (row: TRow) => RowKey;
  onRetry?: () => void;
  onEmptyAction?: () => void;
}

/** Headless 控制器：持有状态与配置，返回带类型的实例；不渲染任何 DOM */
export const useDataTable = <TRow>({
  data,
  getRowKey,
  keywordFields,
  columns,
  filterFields,
  labels,
  paginationLabels,
  onRetry,
  onEmptyAction,
  initialPageSize = 10,
  initialFilters = {},
  state: injectedState,
  emptyWhen,
}: UseDataTableOptions<TRow>): DataTableApi<TRow> => {
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [sortKey, setSortKey] = useState<(keyof TRow & string) | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);
  const [selected, setSelected] = useState<Set<RowKey>>(() => new Set());

  const allRows = useMemo(() => {
    const filtered = filterRows(data, keyword, keywordFields, filters);
    return sortKey ? sortRows(filtered, sortKey, sortDirection) : filtered;
  }, [data, keyword, keywordFields, filters, sortKey, sortDirection]);

  const total = allRows.length;
  const pages = derivePages(total, pageSize);
  const safePage = Math.min(page, pages);
  const rows = useMemo(
    () => paginateRows(allRows, safePage, pageSize),
    [allRows, safePage, pageSize],
  );

  // 用过滤后的 allRows 判空：搜索/筛选无匹配时也进空态（D-01）
  const state = resolveState(
    injectedState ?? "success",
    allRows,
    emptyWhen ? emptyWhen(allRows) : false,
  );

  const pageKeys = useMemo(() => rows.map(getRowKey), [rows, getRowKey]);
  const selectedCountOnPage = pageKeys.filter((key) => selected.has(key)).length;
  const allPageSelected = pageKeys.length > 0 && selectedCountOnPage === pageKeys.length;
  const somePageSelected = selectedCountOnPage > 0 && !allPageSelected;

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageRaw(1);
  }, []);

  // 搜索也回第一页，与 setFilter 一致（D-03）
  const updateKeyword = useCallback((value: string) => {
    setKeyword(value);
    setPageRaw(1);
  }, []);

  const resetFilters = useCallback(() => {
    setKeyword("");
    setFilters({});
    setPageRaw(1);
  }, []);

  const toggleSort = useCallback(
    (key: keyof TRow & string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection(null);
      }
      setPageRaw(1);
    },
    [sortKey, sortDirection],
  );

  const setPage = useCallback(
    (next: number) => setPageRaw(Math.min(Math.max(1, next), pages)),
    [pages],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1);
  }, []);

  const toggleRow = useCallback(
    (key: RowKey) => setSelected((prev) => toggleKey(prev, key)),
    [],
  );

  const toggleAll = useCallback(
    (checked: boolean) => setSelected((prev) => togglePage(prev, pageKeys, checked)),
    [pageKeys],
  );

  const clearSelection = useCallback(() => setSelected(new Set<RowKey>()), []);

  const isSelected = useCallback((key: RowKey) => selected.has(key), [selected]);

  return useMemo(
    () => ({
      state,
      allRows,
      rows,
      total,
      pages,
      page: safePage,
      pageSize,
      keyword,
      filters,
      sortKey,
      sortDirection,
      selected,
      setKeyword: updateKeyword,
      setFilter,
      resetFilters,
      toggleSort,
      setPage,
      setPageSize,
      toggleRow,
      toggleAll,
      clearSelection,
      isSelected,
      allPageSelected,
      somePageSelected,
      columns,
      filterFields,
      labels,
      paginationLabels,
      getRowKey,
      onRetry,
      onEmptyAction,
    }),
    [
      state,
      allRows,
      rows,
      total,
      pages,
      safePage,
      pageSize,
      keyword,
      filters,
      sortKey,
      sortDirection,
      selected,
      updateKeyword,
      setFilter,
      resetFilters,
      toggleSort,
      setPage,
      setPageSize,
      toggleRow,
      toggleAll,
      clearSelection,
      isSelected,
      allPageSelected,
      somePageSelected,
      columns,
      filterFields,
      labels,
      paginationLabels,
      getRowKey,
      onRetry,
      onEmptyAction,
    ],
  );
};
