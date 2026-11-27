import { useCallback, useEffect, useMemo, useState } from "react";
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
  MutationConfig,
  MutationResult,
  PaginationLabels,
  QueryContext,
  QueryOptions,
  RefreshStrategy,
  RowKey,
  SortDirection,
} from "./types";

export interface UseDataTableOptions<TRow> {
  /** 客户端模式的数据源；服务端模式下由业务 setData 提供 */
  data: TRow[];
  /** 标注行类型靠它推断，调用处不显式写泛型 */
  getRowKey: (row: TRow) => RowKey;
  /** 关键词匹配的字段（客户端模式） */
  keywordFields: (keyof TRow & string)[];
  columns: ColumnDef<TRow>[];
  filterFields: FilterField[];
  labels: DataTableLabels;
  paginationLabels: PaginationLabels;
  onRetry?: () => void;
  onEmptyAction?: () => void;
  /** 搜索按钮点击时的重新拉取回调（客户端模式） */
  onSearch?: () => void;
  /**
   * 服务端查询回调：传了即进入服务端模式，前端不再对 data 做过滤/排序/分页。
   * hook 在条件变化时调用它，业务在其中发请求并 setData/setLoading/setError。
   */
  queryOptions?: QueryOptions<TRow>;
  /** 抽屉变更后的更新策略配置（默认 edit→precise / create→refresh-first） */
  mutationConfig?: MutationConfig<TRow>;
  initialPageSize?: number;
  initialFilters?: FilterValues;
  /** 外部可注入初始状态；服务端模式以内部 setLoading/setError 为准 */
  state?: "loading" | "success" | "error";
  /** 原始数据非空但业务派生后为空时覆盖空态判定（客户端模式） */
  emptyWhen?: (rows: TRow[]) => boolean;
}

export interface UseDataTableResult<TRow> {
  state: DataState;
  /** 过滤排序后的全部行（未分页）；服务端模式等于 data */
  allRows: TRow[];
  /** 当前页行；服务端模式等于 data（后端已分页） */
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
  /** 是否服务端模式 */
  serverMode: boolean;
  setKeyword: (value: string) => void;
  setFilter: (key: string, value: FilterValue) => void;
  /** 搜索按钮：回第一页并触发拉取 */
  submitSearch: () => void;
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
  /** 四态驱动（服务端模式用） */
  setLoading: (loading: boolean) => void;
  setError: (message?: string) => void;
  /** 用当前条件重新拉取 */
  reload: () => void;
  /** 服务端模式下由业务设置数据 */
  setData: (data: TRow[]) => void;
  /** 抽屉提交后统一更新列表（按策略精准替换/插入或刷新） */
  applyMutation: (result: MutationResult<TRow>) => void;
  errorMessage: string | null;
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
  data: propData,
  getRowKey,
  keywordFields,
  columns,
  filterFields,
  labels,
  paginationLabels,
  onRetry,
  onEmptyAction,
  onSearch,
  queryOptions,
  mutationConfig,
  initialPageSize = 10,
  initialFilters = {},
  state: injectedState,
  emptyWhen,
}: UseDataTableOptions<TRow>): DataTableApi<TRow> => {
  const serverMode = Boolean(queryOptions);

  const [serverData, setData] = useState<TRow[]>(propData);
  // 客户端模式的精准更新覆盖层：null 表示直接用 propData
  const [clientOverride, setClientOverride] = useState<TRow[] | null>(null);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [sortKey, setSortKey] = useState<(keyof TRow & string) | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);
  const [selected, setSelected] = useState<Set<RowKey>>(() => new Set());
  const [loading, setLoadingState] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 手动触发拉取的计数器：条件未变时也能强制 reload
  const [reloadNonce, setReloadNonce] = useState(0);

  // 客户端模式：精准更新用 clientOverride，否则用 propData；服务端模式用 serverData
  const data = serverMode ? serverData : (clientOverride ?? propData);

  const queryCtx = useMemo<QueryContext<TRow>>(
    () => ({ page, pageSize, keyword, filters, sortKey, sortDirection }),
    [page, pageSize, keyword, filters, sortKey, sortDirection],
  );

  const reload = useCallback(() => {
    if (!queryOptions) return;
    void queryOptions(queryCtx);
  }, [queryOptions, queryCtx]);

  /** 手动强制拉取：递增 nonce 走 effect，避免与条件变化的 effect 重复 */
  const requestReload = useCallback(() => setReloadNonce((n) => n + 1), []);

  /** 判定编辑是否改动了排序字段或筛选字段（改动则需刷新，精准替换会显示错误） */
  const affectsOrderOrFilter = useCallback(
    (result: MutationResult<TRow>): boolean => {
      if (result.mode !== "edit" || !result.previous) return false;
      const keys = new Set<string>();
      if (sortKey) keys.add(sortKey);
      filterFields.forEach((field) => keys.add(field.key));
      for (const key of keys) {
        if (result.previous[key as keyof TRow] !== result.row[key as keyof TRow]) return true;
      }
      return false;
    },
    [sortKey, filterFields],
  );

  const resolveStrategy = useCallback(
    (result: MutationResult<TRow>): RefreshStrategy => {
      const configured = mutationConfig?.strategy;
      const base = typeof configured === "function"
        ? configured(result)
        : configured ?? (result.mode === "create" ? "refresh-first" : "precise");
      // 精准更新但动了排序/筛选字段 → 降级为刷新
      if (base === "precise" && affectsOrderOrFilter(result)) return "refresh";
      return base;
    },
    [mutationConfig, affectsOrderOrFilter],
  );

  const applyMutation = useCallback(
    (result: MutationResult<TRow>) => {
      const strategy = resolveStrategy(result);
      const rowKey = getRowKey(result.row);

      if (strategy === "precise") {
        // 行内替换/插入：按主键定位，存在则替换、不存在则追加
        const replaceOrInsert = (rows: TRow[]): TRow[] => {
          const index = rows.findIndex((row) => getRowKey(row) === rowKey);
          if (index === -1) return [...rows, result.row];
          const next = [...rows];
          next[index] = result.row;
          return next;
        };
        if (serverMode) setData((prev) => replaceOrInsert(prev));
        else setClientOverride((prev) => replaceOrInsert(prev ?? propData));
      } else {
        // refresh / refresh-first：回第一页（refresh-first）并重新拉取/重算
        if (strategy === "refresh-first") setPageRaw(1);
        setClientOverride(null); // 清掉精准覆盖，回到数据源
        if (serverMode) requestReload(); // 走 effect，避免与页码变化的 effect 重复拉取
      }

      mutationConfig?.onMutated?.(result, strategy);
    },
    [resolveStrategy, getRowKey, serverMode, propData, requestReload, mutationConfig],
  );

  // 服务端模式：条件变化或 reloadNonce 变化触发拉取（首次挂载也拉一次）
  useEffect(() => {
    if (serverMode) reload();
  }, [serverMode, reload, reloadNonce]);

  const allRows = useMemo(() => {
    if (serverMode) return data;
    const filtered = filterRows(data, keyword, keywordFields, filters);
    return sortKey ? sortRows(filtered, sortKey, sortDirection) : filtered;
  }, [serverMode, data, keyword, keywordFields, filters, sortKey, sortDirection]);

  const total = allRows.length;
  const pages = derivePages(total, pageSize);
  const safePage = Math.min(page, pages);
  const rows = useMemo(
    () => (serverMode ? data : paginateRows(allRows, safePage, pageSize)),
    [serverMode, data, allRows, safePage, pageSize],
  );

  const state = useMemo<DataState>(() => {
    if (loading) return "loading";
    if (errorMessage !== null) return "error";
    if (serverMode) return data.length === 0 ? "empty" : "success";
    return resolveState(
      injectedState ?? "success",
      allRows,
      emptyWhen ? emptyWhen(allRows) : false,
    );
  }, [loading, errorMessage, serverMode, data, allRows, injectedState, emptyWhen]);

  const setLoading = useCallback((value: boolean) => {
    setLoadingState(value);
    if (value) setErrorMessage(null);
  }, []);

  const setError = useCallback((message?: string) => {
    setErrorMessage(message ?? "加载失败");
    setLoadingState(false);
  }, []);

  const pageKeys = useMemo(() => rows.map(getRowKey), [rows, getRowKey]);
  const selectedCountOnPage = pageKeys.filter((key) => selected.has(key)).length;
  const allPageSelected = pageKeys.length > 0 && selectedCountOnPage === pageKeys.length;
  const somePageSelected = selectedCountOnPage > 0 && !allPageSelected;

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageRaw(1);
  }, []);

  const updateKeyword = useCallback((value: string) => {
    setKeyword(value);
    setPageRaw(1);
  }, []);

  const submitSearch = useCallback(() => {
    setPageRaw(1);
    if (!queryOptions) onSearch?.();
    else requestReload();
  }, [queryOptions, onSearch, requestReload]);

  const resetFilters = useCallback(() => {
    setKeyword("");
    setFilters({});
    setPageRaw(1);
    if (!queryOptions) onSearch?.();
    else requestReload();
  }, [queryOptions, onSearch, requestReload]);

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
      serverMode,
      setKeyword: updateKeyword,
      setFilter,
      submitSearch,
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
      setLoading,
      setError,
      reload,
      setData,
      applyMutation,
      errorMessage,
      columns,
      filterFields,
      labels,
      paginationLabels,
      getRowKey,
      onRetry,
      onEmptyAction,
    }),
    [
      state, allRows, rows, total, pages, safePage, pageSize, keyword, filters,
      sortKey, sortDirection, selected, serverMode, updateKeyword, setFilter,
      submitSearch, resetFilters, toggleSort, setPage, setPageSize, toggleRow,
      toggleAll, clearSelection, isSelected, allPageSelected, somePageSelected,
      setLoading, setError, reload, applyMutation, errorMessage, columns, filterFields, labels,
      paginationLabels, getRowKey, onRetry, onEmptyAction,
    ],
  );
};
