import { LOG_LEVELS } from "@starter/shared";

/** 日志级别 → Mantine 颜色（日志页与详情共用） */
export const LEVEL_COLOR: Record<string, string> = {
  trace: "gray",
  debug: "gray",
  info: "blue",
  warn: "yellow",
  error: "red",
  fatal: "red",
};

/** 日志级别筛选项（与后端 DTO 共用 shared 的 LOG_LEVELS） */
export const LEVEL_OPTIONS = LOG_LEVELS.map((level) => ({
  value: level,
  label: level,
}));

/** 时间范围筛选项（value 与后端 LOG_RANGES 一致） */
export const RANGE_OPTIONS = [
  { value: "15m", label: "近 15 分钟" },
  { value: "1h", label: "近 1 小时" },
  { value: "6h", label: "近 6 小时" },
  { value: "24h", label: "近 24 小时" },
  { value: "7d", label: "近 7 天" },
];

/** 审计结果 → 颜色 / 文案 */
export const RESULT_COLOR: Record<string, string> = {
  success: "green",
  failure: "red",
};

export const RESULT_LABEL: Record<string, string> = {
  success: "成功",
  failure: "失败",
};
