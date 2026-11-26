import type { DataTableLabels, PaginationLabels } from "./types";

/**
 * 中性默认文案，只保证底座能独立跑起来。
 * 业务页应注入自己的 labels（覆盖用户/订单等具体名词），不要直接拿这份当业务文案。
 */
export const dataTableLabels: DataTableLabels = {
  searchPlaceholder: "搜索…",
  reset: "重置",
  statusAll: "全部",
  loadingHint: "加载中…",
  emptyTitle: "暂无数据",
  emptyDescription: "当前条件下没有数据。",
  errorTitle: "加载失败",
  errorDescription: "无法获取数据，请稍后重试。",
  retry: "重试",
  create: "新建",
  selectedCount: (n) => `已选 ${n} 项`,
  batchDelete: "批量删除",
  batchEnable: "批量启用",
  batchDisable: "批量停用",
  batchTitle: "批量操作",
  cancel: "取消",
  confirm: "确认",
  confirmDelete: (n) => `确定删除选中的 ${n} 项？此操作不可撤销。`,
  confirmEnable: (n) => `确定启用选中的 ${n} 项？`,
  confirmDisable: (n) => `确定停用选中的 ${n} 项？`,
};

export const paginationLabels: PaginationLabels = {
  total: (n) => `共 ${n} 条`,
  pageSize: "每页条数",
};
