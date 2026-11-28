import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 从 cwd 向上找最近的 .env 并加载（兼容源码 / 编译产物不同目录层级）。
 *
 * 必须在 AppModule 与 tracing 初始化之前调用；重复调用是幂等的
 * （dotenv 默认不覆盖已存在的环境变量）。
 */
export const loadEnv = (): string | undefined => {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) {
      config({ path: candidate });
      return candidate;
    }
    dir = resolve(dir, "..");
  }
  return undefined;
};
