import type { FilterField } from "./types";

/** 通用下拉筛选字段构造：底座不认识业务字段，由调用方传 key 与选项 */
export const selectField = (config: {
  key: string;
  label: string;
  allLabel?: string;
  options: { label: string; value: string }[];
  placement?: "inline" | "more";
}): FilterField => ({
  type: "select",
  key: config.key,
  label: config.label,
  allLabel: config.allLabel,
  options: config.options,
  placement: config.placement ?? "inline",
});
