/**
 * RLS S4：并发验证 30 个请求交替访问两个**真实**租户，断言 0 次串数据。
 * 同时验证负向场景：未设置 app.tenant_id 时租户表查询返回 0 行（fail-closed）。
 * 前置：迁移已应用、应用用户非 superuser（见 docker/init-db.sql）。
 * 运行：pnpm --filter @starter/server test:rls
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

let dir = dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 5; i++) {
  const candidate = resolve(dir, ".env");
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
  dir = resolve(dir, "..");
}

const TENANT_A = "00000000-0000-4000-8000-000000000001"; // seed 默认租户，2 个角色
const TENANT_B = "00000000-0000-4000-8000-00000000000b"; // 测试租户，脚本创建 2 个角色
const CONCURRENCY = 30;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: CONCURRENCY + 2,
});

const withTx = async (tenantId, fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [
      tenantId,
    ]);
    return await fn(client);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
};

async function setup() {
  const client = await pool.connect();
  try {
    // tenants 表无 RLS，可直接 upsert
    await client.query(
      `INSERT INTO tenants (id, name, slug, status, "createdAt", "updatedAt")
       VALUES ($1, 'RLS Test B', 'rls-test-b', 'active', now(), now())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [TENANT_B],
    );
    // roles 有 RLS + WITH CHECK，必须在设置了 tenant B 的事务内写入
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [
      TENANT_B,
    ]);
    for (const code of ["admin", "member"]) {
      await client.query(
        `INSERT INTO roles (id, "tenantId", code, name, "isSystem", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $2, false, now(), now())
         ON CONFLICT ("tenantId", code) DO NOTHING`,
        [TENANT_B, code],
      );
    }
    await client.query("COMMIT");
  } finally {
    client.release();
  }
}

async function cleanup() {
  try {
    await withTx(TENANT_B, (client) =>
      client.query('DELETE FROM roles WHERE "tenantId" = $1', [TENANT_B]),
    );
    await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_B]);
  } catch {
    /* 清理失败不掩盖测试结论 */
  }
}

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

await setup();
try {
  // 负向：未设置 app.tenant_id 时应返回 0 行（fail-closed，不是报错）
  const noVar = await pool.query("SELECT count(*)::int AS c FROM roles");
  check("未设置 app.tenant_id 时 0 行", noVar.rows[0].c === 0, `rows=${noVar.rows[0].c}`);

  const tasks = Array.from({ length: CONCURRENCY }, (_, i) => {
    const tenantId = i % 2 === 0 ? TENANT_A : TENANT_B;
    return withTx(tenantId, async (client) => {
      const { rows } = await client.query('SELECT "tenantId" FROM roles');
      const leaked = rows.filter((row) => row.tenantId !== tenantId).length;
      return { tenantId, rows: rows.length, leaked };
    });
  });

  const results = await Promise.all(tasks);
  const groupA = results.filter((r) => r.tenantId === TENANT_A);
  const groupB = results.filter((r) => r.tenantId === TENANT_B);
  const totalLeaked = results.reduce((sum, r) => sum + r.leaked, 0);

  check(
    "租户 A 只看到自己的 2 行",
    groupA.length === CONCURRENCY / 2 && groupA.every((r) => r.rows === 2),
    `${groupA.length} 次请求，每次 ${groupA[0]?.rows} 行`,
  );
  check(
    "租户 B 只看到自己的 2 行",
    groupB.length === CONCURRENCY / 2 && groupB.every((r) => r.rows === 2),
    `${groupB.length} 次请求，每次 ${groupB[0]?.rows} 行`,
  );
  check("30 并发 0 串数据", totalLeaked === 0, `串数据 ${totalLeaked} 次`);
} finally {
  await cleanup();
  await pool.end();
}

console.log(failed ? `\n${failed} 项失败` : "\nS4 并发验证通过");
process.exit(failed ? 1 : 0);
