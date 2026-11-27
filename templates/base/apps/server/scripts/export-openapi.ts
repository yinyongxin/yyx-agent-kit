import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

// 与 main.ts 一致：从脚本目录向上找最近的 .env
let envDir = __dirname;
for (let i = 0; i < 4; i++) {
  const candidate = resolve(envDir, ".env");
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
  envDir = resolve(envDir, "..");
}

import { NestFactory } from "@nestjs/core";
import { NodeAdapter } from "@nestjs/platform-node";
import { API_PREFIX } from "../../../packages/shared/src/index";

/**
 * 离线导出 OpenAPI JSON。
 *
 * 注意：tsx/esbuild 不会生成 decorator metadata，直接用 tsx 加载 src 会让 Nest DI 失效。
 * 因此这里从已编译的 dist 加载 AppModule / buildOpenApiDocument（tsc 产物带 metadata）。
 * 运行前先 `pnpm --filter @starter/server build`。
 */
const requireDist = createRequire(__filename);
const distRoot = resolve(__dirname, "../dist/apps/server/src");
const appModulePath = resolve(distRoot, "app.module.js");
if (!existsSync(appModulePath)) {
  throw new Error(
    `未找到编译产物 ${appModulePath}：请先运行 pnpm --filter @starter/server build`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppModule } = requireDist(appModulePath) as typeof import("../src/app.module");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildOpenApiDocument } =
  requireDist(resolve(distRoot, "swagger.js")) as typeof import("../src/swagger");

const main = async () => {
  const app = await NestFactory.create(AppModule, new NodeAdapter(), {
    logger: ["error", "warn"],
  });
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ""));

  const document = buildOpenApiDocument(app);
  const out = resolve(__dirname, "../../../packages/api/openapi.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  console.log(`OpenAPI 已导出：${out}`);

  await app.close();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
