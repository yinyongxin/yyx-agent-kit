import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/** 测试租户 slug 前缀；只清理软删除且命中这些前缀的租户。 */
export const TEST_TENANT_PREFIXES = [
  "e2e-",
  "audit-",
  "prov-",
  "ui-",
  "test-",
  "ego-",
] as const;

export type TestTenant = {
  id: string;
  name: string;
  slug: string;
  deletedAt: Date | null;
};

export async function findTestTenants(
  prisma: PrismaClient,
): Promise<TestTenant[]> {
  return prisma.tenant.findMany({
    where: {
      deletedAt: { not: null },
      OR: [
        ...TEST_TENANT_PREFIXES.map((prefix) => ({
          slug: { startsWith: prefix },
        })),
        { slug: "test" },
      ],
    },
    select: { id: true, name: true, slug: true, deletedAt: true },
    orderBy: { deletedAt: "asc" },
  });
}

export async function deleteTestTenants(
  prisma: PrismaClient,
  tenants: TestTenant[],
): Promise<number> {
  let removed = 0;
  for (const tenant of tenants) {
    await prisma.tenant.delete({ where: { id: tenant.id } });
    removed += 1;
  }
  return removed;
}

/** 审计表受 append-only RLS 保护，维护操作必须用 bootstrap 管理员连接。 */
export function createAuditAdminClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export async function countAuditLogs(admin: PrismaClient): Promise<number> {
  const rows = await admin.$queryRawUnsafe<{ count: bigint }[]>(
    'SELECT count(*)::bigint AS count FROM "audit_logs"',
  );
  return Number(rows[0]?.count ?? 0);
}

export async function purgeAuditLogs(admin: PrismaClient): Promise<number> {
  const count = await countAuditLogs(admin);
  if (count > 0) {
    await admin.$executeRawUnsafe('TRUNCATE TABLE "audit_logs"');
  }
  return count;
}
