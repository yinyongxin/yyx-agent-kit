import { createContext, useContext, type ReactNode } from "react";
import type { UseDataTableResult } from "./useDataTable";
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

/** Context 内部用 unknown 承载行，外部通过泛型 hook 取回类型 */
interface DataTableContextValue {
  state: DataState;
  rows: unknown[];
  allRows: unknown[];
  columns: ColumnDef<never>[];
  total: number;
  pages: number;
  page: number;
  pageSize: number;
  keyword: string;
  filters: FilterValues;
  setKeyword: (value: string) => void;
  setFilter: (key: string, value: FilterValue) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  sortKey: string | null;
  sortDirection: SortDirection;
  toggleSort: (key: string) => void;
  selected: Set<RowKey>;
  toggleRow: (key: RowKey) => void;
  toggleAll: (checked: boolean) => void;
  isSelected: (key: RowKey) => boolean;
  allPageSelected: boolean;
  somePageSelected: boolean;
  labels: DataTableLabels;
  paginationLabels: PaginationLabels;
  filterFields: FilterField[];
  getRowKey: (row: unknown) => RowKey;
  onRetry?: () => void;
  onEmptyAction?: () => void;
}

const DataTableContext = createContext<DataTableContextValue | null>(null);

export interface TypedDataTableContext<TRow> extends Omit<
  DataTableContextValue,
  "rows" | "allRows" | "columns" | "sortKey" | "toggleSort" | "getRowKey"
> {
  rows: TRow[];
  allRows: TRow[];
  columns: ColumnDef<TRow>[];
  sortKey: (keyof TRow & string) | null;
  toggleSort: (key: keyof TRow & string) => void;
  getRowKey: (row: TRow) => RowKey;
}

/** 组合组件内部取 Context；调用处用泛型拿回行类型 */
export const useDataTableContext = <TRow,>(): TypedDataTableContext<TRow> => {
  const ctx = useContext(DataTableContext);
  if (!ctx) throw new Error("DataTable 组合组件必须在 <DataTable> 内部使用");
  return ctx as unknown as TypedDataTableContext<TRow>;
};

export interface DataTableProps<TRow> {
  list: UseDataTableResult<TRow>;
  columns: ColumnDef<TRow>[];
  filterFields: FilterField[];
  labels: DataTableLabels;
  paginationLabels: PaginationLabels;
  getRowKey: (row: TRow) => RowKey;
  onRetry?: () => void;
  onEmptyAction?: () => void;
  children: ReactNode;
}

/** Root：Provider + 容器，原子自由摆放 */
export const DataTable = <TRow,>({
  list,
  columns,
  filterFields,
  labels,
  paginationLabels,
  getRowKey,
  onRetry,
  onEmptyAction,
  children,
}: DataTableProps<TRow>) => (
  <DataTableContext.Provider
    value={
      {
        ...list,
        columns,
        filterFields,
        labels,
        paginationLabels,
        getRowKey,
        onRetry,
        onEmptyAction,
      } as unknown as DataTableContextValue
    }
  >
    <div>{children}</div>
  </DataTableContext.Provider>
);
