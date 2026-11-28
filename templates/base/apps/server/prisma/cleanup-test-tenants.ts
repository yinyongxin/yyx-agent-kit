/**
 * 清理本地软删除的测试租户（默认 dry-run）。
 *
 * 只删除 `deletedAt IS NOT NULL` 且 slug 命中测试前缀的租户：
 * e2e-* / audit-* / prov-* / ui-* / test-* / ego-* / test
 *
 * 外键级联会删除 roles / user_tenants / files / subscriptions。
 * 默认保留 audit_logs；加 `--purge-audit` 时用 MIGRATE_DATABASE_URL
 * （bootstrap 管理员）清空审计表，因为应用账号受 append-only RLS 限制。
 *
 * 运行：
 *   pnpm --filter @starter/server db:cleanup:test-tenants
 *   pnpm --filter @starter/server db:cleanup:test-tenants -- --apply
 *   pnpm --filter @starter/server db:cleanup:test-tenants -- --apply --purge-audit
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  countAuditLogs,
  createAuditAdminClient,
  deleteTestTenants,
  findTestTenants,
  purgeAuditLogs,
} from "../src/dev/db-cleanup";

config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const APPLY = process.argv.includes("--apply");
const PURGE_AUDIT = process.argv.includes("--purge-audit");

async function main() {
  const tenants = await findTestTenants(prisma);

  if (tenants.length === 0) {
    console.log("没有需要清理的软删除测试租户。");
  } else {
    console.log(`找到 ${tenants.length} 个软删除测试租户：`);
    for (const tenant of tenants) {
      console.log(`- ${tenant.slug} · ${tenant.name} · ${tenant.id}`);
    }
    if (APPLY) {
      const removed = await deleteTestTenants(prisma, tenants);
      console.log(`\n已删除 ${removed} 个测试租户。`);
    }
  }

  if (PURGE_AUDIT) {
    const adminUrl = process.env.MIGRATE_DATABASE_URL;
    if (!adminUrl) {
      throw new Error(
        "清空 audit_logs 需要 MIGRATE_DATABASE_URL（bootstrap 管理员账号）",
      );
    }
    const admin = createAuditAdminClient(adminUrl);
    try {
      if (!APPLY) {
        const count = await countAuditLogs(admin);
        console.log(`audit_logs 当前 ${count} 条；加 \`--apply\` 后清空。`);
      } else {
        const purged = await purgeAuditLogs(admin);
        console.log(`已清空 ${purged} 条 audit_logs。`);
      }
    } finally {
      await admin.$disconnect();
    }
  } else if (APPLY && tenants.length > 0) {
    console.log("audit_logs 保留；需要清空时加 `--purge-audit`。");
  }

  if (!APPLY) {
    console.log("\n当前是 dry-run。确认后加 `-- --apply` 执行删除。");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
