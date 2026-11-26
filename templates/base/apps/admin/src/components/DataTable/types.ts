import type { ReactNode } from "react";

/** 行主键：支持字符串或数字，与 clinic-desk 的通用主键约定一致 */
export type RowKey = string | number;

/** 四态：加载 / 有数据 / 空 / 错误 */
export type DataState = "loading" | "success" | "empty" | "error";

/** 排序方向：升 / 降 / 无（三态循环） */
export type SortDirection = "asc" | "desc" | null;

/** 列定义：key 对应行字段，render 可自定义单元格，sortable 标记可排序列 */
export interface ColumnDef<TRow> {
  key: keyof TRow & string;
  title: ReactNode;
  width?: number | string;
  sortable?: boolean;
  render?: (row: TRow) => ReactNode;
}

/** 筛选字段类型：本期用 select / text，其余为后续扩展预留 */
export type FilterFieldType = "select" | "text" | "segmented" | "dateRange" | "preset";

/** 单个筛选字段配置 */
export interface FilterField {
  type: FilterFieldType;
  key: string;
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  allLabel?: string;
}

/** 筛选值：string | number | null，0 是合法值 */
export type FilterValue = string | number | null;
export type FilterValues = Record<string, FilterValue>;

/** 文案集合：由业务注入，不 import i18n */
export interface DataTableLabels {
  searchPlaceholder: string;
  reset: string;
  statusAll: string;
  loadingHint: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  errorDescription: string;
  retry: string;
  create: string;
  selectedCount: (n: number) => string;
  batchDelete: string;
  batchEnable: string;
  batchDisable: string;
  confirmDelete: (n: number) => string;
  confirmEnable: (n: number) => string;
  confirmDisable: (n: number) => string;
}

/** 分页文案 */
export interface PaginationLabels {
  total: (n: number) => string;
  pageSize: string;
}
