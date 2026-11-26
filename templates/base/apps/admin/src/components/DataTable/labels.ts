import type { DataTableLabels, PaginationLabels } from "./types";

/** 本期中文文案常量；后续接 i18n 时由业务页注入自己的 labels */
export const dataTableLabels: DataTableLabels = {
  searchPlaceholder: "搜索用户…",
  reset: "重置",
  statusAll: "全部",
  loadingHint: "加载中…",
  emptyTitle: "暂无用户数据",
  emptyDescription: "创建第一个用户后即可在此管理。",
  errorTitle: "加载失败",
  errorDescription: "无法获取用户数据，请稍后重试。",
  retry: "重试",
  create: "新建用户",
  selectedCount: (n) => `已选 ${n} 项`,
  batchDelete: "批量删除",
  batchEnable: "批量启用",
  batchDisable: "批量停用",
  confirmDelete: (n) => `确定删除选中的 ${n} 个用户？此操作不可撤销。`,
  confirmEnable: (n) => `确定启用选中的 ${n} 个用户？`,
  confirmDisable: (n) => `确定停用选中的 ${n} 个用户？停用后无法登录。`,
};

export const paginationLabels: PaginationLabels = {
  total: (n) => `共 ${n} 条`,
  pageSize: "每页条数",
};
