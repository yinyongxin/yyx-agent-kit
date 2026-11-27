import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// .env 在项目根，Prisma CLI 从 apps/server 运行：向上找最近的 .env（与 main.ts findEnv 一致）
let dir = process.cwd();
for (let i = 0; i < 4; i++) {
  const candidate = resolve(dir, ".env");
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
  dir = resolve(dir, "..");
}

export default defineConfig({
  // 指向目录（不是文件）：Prisma 会自动合并主文件 + models/*.prisma。
  // 指向单文件会静默忽略 models/ 下的模型（官方坑，见踩坑记录）。
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // 迁移/建库用 bootstrap superuser（migrate dev 需要 CREATEDB 影子库、DDL 权限）；
    // 应用运行时用 DATABASE_URL（app_rw，非 superuser，RLS 生效）
    url: process.env["MIGRATE_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
});
