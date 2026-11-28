/**
 * 清理本地软删除的测试租户（默认 dry-run）。
 *
 * 只删除 `deletedAt IS NOT NULL` 且 slug 命中测试前缀的租户：
 * e2e-* / audit-* / prov-* / ui-* / test-* / ego-* / test
 *
 * 外键级联会删除 roles / user_tenants / files / subscriptions；
 * audit_logs 没有 tenant 外键，保留用于审计。
 *
 * 运行：
 *   pnpm --filter @starter/server db:cleanup:test-tenants
 *   pnpm --filter @starter/server db:cleanup:test-tenants -- --apply
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const APPLY = process.argv.includes("--apply");
const PREFIXES = ["e2e-", "audit-", "prov-", "ui-", "test-", "ego-"];

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: {
      deletedAt: { not: null },
      OR: [
        ...PREFIXES.map((prefix) => ({ slug: { startsWith: prefix } })),
        { slug: "test" },
      ],
    },
    select: { id: true, name: true, slug: true, deletedAt: true },
    orderBy: { deletedAt: "asc" },
  });

  if (tenants.length === 0) {
    console.log("没有需要清理的软删除测试租户。");
    return;
  }

  console.log(`找到 ${tenants.length} 个软删除测试租户：`);
  for (const tenant of tenants) {
    console.log(`- ${tenant.slug} · ${tenant.name} · ${tenant.id}`);
  }

  if (!APPLY) {
    console.log("\n当前是 dry-run。确认后加 `-- --apply` 执行删除。");
    return;
  }

  let removed = 0;
  for (const tenant of tenants) {
    await prisma.tenant.delete({ where: { id: tenant.id } });
    removed += 1;
  }

  console.log(`\n已删除 ${removed} 个测试租户；audit_logs 保留。`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
