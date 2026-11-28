/**
 * 从生成的 API 客户端错误体里取可展示的 message。
 *
 * Nest 的 ValidationPipe 会把多条校验错误放在 `message: string[]` 里，
 * 这里统一拼成一行；取不到就退回业务兜底文案。
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message)) {
      const text = message.filter((item): item is string => typeof item === "string");
      if (text.length > 0) return text.join("；");
    }
  }
  return fallback;
};
