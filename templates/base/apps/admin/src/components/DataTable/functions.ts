import type {
  DataState,
  FilterValues,
  RowKey,
  SortDirection,
} from "./types";

/** 四态判定：只有原始数据与派生数据都为空才算 empty */
export const resolveState = <TRow>(
  state: "loading" | "success" | "error",
  rows: TRow[],
  derivedEmpty: boolean,
): DataState => {
  if (state === "loading") return "loading";
  if (state === "error") return "error";
  if (rows.length === 0 || derivedEmpty) return "empty";
  return "success";
};

/** 分页推导：总页数只在此处产生，供 Pagination 与翻页边界共用 */
export const derivePages = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / pageSize));

/** 安全页码：翻页边界用同一份 pages 推导，杜绝「可点但拒绝」 */
export const clampPage = (page: number, pages: number): number =>
  Math.min(Math.max(1, page), pages);

/** 过滤：关键词按指定字段匹配，筛选值非 null 才生效（0 是合法值） */
export const filterRows = <TRow>(
  rows: TRow[],
  keyword: string,
  keywordFields: (keyof TRow & string)[],
  filters: FilterValues,
): TRow[] => {
  const kw = keyword.trim().toLowerCase();
  return rows.filter((row) => {
    const matchKeyword =
      kw === "" ||
      keywordFields.some((field) => String(row[field] ?? "").toLowerCase().includes(kw));
    if (!matchKeyword) return false;

    return Object.entries(filters).every(([key, value]) => {
      if (value === null) return true;
      return String(row[key as keyof TRow] ?? "") === String(value);
    });
  });
};

/** 排序：数字按数值比较，其余按中文字符串比较；desc 统一反向 */
export const sortRows = <TRow>(
  rows: TRow[],
  key: keyof TRow & string,
  direction: SortDirection,
): TRow[] => {
  if (direction === null) return rows;
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * factor;
    }
    return String(av ?? "").localeCompare(String(bv ?? ""), "zh-CN") * factor;
  });
};

/** 当前页切片 */
export const paginateRows = <TRow>(
  rows: TRow[],
  page: number,
  pageSize: number,
): TRow[] => rows.slice((page - 1) * pageSize, page * pageSize);

/** 选中集合切换 */
export const toggleKey = <T extends RowKey>(selected: Set<T>, key: T): Set<T> => {
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

/** 全选/取消当前页（不影响其它页的选中） */
export const togglePage = <T extends RowKey>(
  selected: Set<T>,
  keys: T[],
  checked: boolean,
): Set<T> => {
  const next = new Set(selected);
  keys.forEach((key) => (checked ? next.add(key) : next.delete(key)));
  return next;
};

/** 从配置与值推导筛选芯片（展示用） */
export const buildFilterChips = (
  fields: { key: string; label: string }[],
  values: FilterValues,
): { key: string; label: string; value: string }[] =>
  fields
    .filter((field) => values[field.key] !== null && values[field.key] !== undefined)
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: String(values[field.key]),
    }));

/** 生效筛选字段数（用于「更多筛选」角标） */
export const activeFieldCount = (values: FilterValues): number =>
  Object.values(values).filter((v) => v !== null && v !== undefined && v !== "").length;
