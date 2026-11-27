import { defineConfig } from "@hey-api/openapi-ts";

/**
 * 从后端导出的 OpenAPI 规范生成前端客户端。
 * 运行：pnpm --filter @starter/api openapi-ts（或根目录 pnpm api:generate）
 * 输入是 scripts/export-openapi.ts 写出的 openapi.json，不依赖运行中的服务。
 */
export default defineConfig({
  input: "./openapi.json",
  output: "src/generated",
  plugins: ["@hey-api/client-fetch"],
});
