/** 日志中需要脱敏的字段（大小写不敏感，任意层级） */
const SENSITIVE_KEY =
  /(password|passwd|pwd|secret|authorization|cookie|api[-_]?key|private[-_]?key|credential|access[-_]?token|refresh[-_]?token|^token$)/i;

const MAX_DEPTH = 6;
const MAX_ARRAY = 50;
const MAX_STRING = 2000;

const mask = "[REDACTED]";

/**
 * 递归脱敏 + 控制体积，用于请求/响应体日志。
 * 不修改原对象，返回可安全 JSON 序列化的副本。
 */
export const sanitizeForLog = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value == null) return value;
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return "[Function]";
  if (typeof value !== "object") return String(value);

  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[Binary ${value.length} bytes]`;

  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) return "[Circular]";
  seen.add(obj);

  if (depth >= MAX_DEPTH) return "[MaxDepth]";

  if (Array.isArray(obj)) {
    return obj
      .slice(0, MAX_ARRAY)
      .map((item) => sanitizeForLog(item, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(obj)) {
    result[key] = SENSITIVE_KEY.test(key) ? mask : sanitizeForLog(item, depth + 1, seen);
  }
  return result;
};

/**
 * 脱敏后按 JSON 大小截断。超过 limit 时返回预览，避免日志被单个响应撑爆。
 */
export const truncateForLog = (value: unknown, limit: number): unknown => {
  if (value === undefined) return undefined;
  const sanitized = sanitizeForLog(value);

  try {
    const text = JSON.stringify(sanitized);
    if (text.length <= limit) return sanitized;
    return {
      truncated: true,
      size: text.length,
      preview: `${text.slice(0, limit)}…`,
    };
  } catch {
    return "[Unserializable]";
  }
};
