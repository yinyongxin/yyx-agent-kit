import type { FilterField } from "./types";

/** 构造状态筛选字段（本期用户页用） */
export const statusField = (labels: {
  label: string;
  allLabel: string;
  active: string;
  disabled: string;
}): FilterField => ({
  type: "select",
  key: "status",
  label: labels.label,
  allLabel: labels.allLabel,
  options: [
    { label: labels.active, value: "active" },
    { label: labels.disabled, value: "disabled" },
  ],
});

/** 文字搜索字段配置（关键词走单独 state，这里只描述占位文案） */
export const keywordField = (placeholder: string): FilterField => ({
  type: "text",
  key: "keyword",
  label: placeholder,
  placeholder,
});
