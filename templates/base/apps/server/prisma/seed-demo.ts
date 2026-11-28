/**
 * 本地演示账号 CLI（仅开发环境使用）。
 *
 * 创建平台超管/运维、租户管理员、普通成员、文件管理员、多租户用户、
 * 停用成员、禁用账号。核心逻辑与开发面板「重置演示账号」共用
 * `src/dev/demo-seed.ts`。
 *
 * 运行：`pnpm --filter @starter/server db:seed:demo`
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEFAULT_DEMO_PASSWORD,
  seedDemoAccounts,
} from "../src/dev/demo-seed";

config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const password = process.env.DEMO_USER_PASSWORD ?? DEFAULT_DEMO_PASSWORD;

seedDemoAccounts(prisma, password)
  .then((result) => {
    console.log(`演示账号已就绪，统一密码：${result.password}`);
    console.table(result.accounts);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
