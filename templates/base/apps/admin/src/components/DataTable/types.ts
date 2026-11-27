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

/** 筛选字段类型：筛选栏当前只实现 select；等真正实现其它类型再加，避免「配了没效果」 */
export type FilterFieldType = "select";

/** 单个筛选字段配置 */
export interface FilterField {
  type: FilterFieldType;
  key: string;
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  allLabel?: string;
  /** inline 常驻显示；more 收进「更多筛选」浮层，默认 inline */
  placement?: "inline" | "more";
}

/** 筛选值：string | number | null，0 是合法值 */
export type FilterValue = string | number | null;
export type FilterValues = Record<string, FilterValue>;

/** 文案集合：由业务注入，不 import i18n */
export interface DataTableLabels {
  searchPlaceholder: string;
  search: string;
  reset: string;
  moreFilters: string;
  clearFilter: (label: string) => string;
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
  batchTitle: string;
  cancel: string;
  confirm: string;
  confirmDelete: (n: number) => string;
  confirmEnable: (n: number) => string;
  confirmDisable: (n: number) => string;
}

/** 服务端查询上下文：条件变化时传给 queryOptions，由业务据此发请求 */
export interface QueryContext<TRow> {
  page: number;
  pageSize: number;
  keyword: string;
  filters: FilterValues;
  sortKey: (keyof TRow & string) | null;
  sortDirection: SortDirection;
}

/** 服务端查询回调：hook 调用它，业务在其中发请求并 setData/setLoading/setError */
export type QueryOptions<TRow> = (ctx: QueryContext<TRow>) => void | Promise<void>;

/** 抽屉变更：create 新增 / edit 编辑 */
export type MutationMode = "create" | "edit";

/** 变更后的列表更新策略 */
export type RefreshStrategy =
  | "precise" // 行内替换/插入，保页面/滚动
  | "refresh" // 当前条件重拉
  | "refresh-first"; // 回第一页重拉（新增常用）

/** 抽屉提交结果：row 为落库后的完整行；previous 为编辑前的原行（用于判定排序/筛字段是否变化） */
export interface MutationResult<TRow> {
  row: TRow;
  mode: MutationMode;
  previous?: TRow;
}

/** 变更配置：覆盖默认策略 + 变更后的提示 */
export interface MutationConfig<TRow> {
  strategy?: RefreshStrategy | ((result: MutationResult<TRow>) => RefreshStrategy);
  onMutated?: (result: MutationResult<TRow>, strategy: RefreshStrategy) => void;
}

/** 批量操作：底座只管选中态、确认与回调，业务负责真正改数据 */
export interface DataTableBatchAction {
  key: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  variant?: "light" | "subtle" | "filled" | "outline";
  /** 传了就先弹确认框，参数为选中条数 */
  confirm?: (n: number) => string;
  run: (keys: RowKey[]) => void;
}

/** 分页文案 */
export interface PaginationLabels {
  total: (n: number) => string;
  pageSize: string;
}
