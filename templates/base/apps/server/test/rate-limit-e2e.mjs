/**
 * 全站 API 限流验收（开发探针 3 次/分钟）。
 * 前置：server 启动、Redis 可用、非生产环境。
 * 运行：`pnpm --filter @starter/server test:rate-limit`
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";

let dir = dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 5; i++) {
  const candidate = resolve(dir, ".env");
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
  dir = resolve(dir, "..");
}

const BASE = process.env.API_BASE ?? "http://localhost:47100/starter/api";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` · ${detail}` : ""}`);
  if (!ok) failed++;
};

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:46379");

async function clearRateKeys() {
  const keys = await redis.keys("rate:api:*");
  if (keys.length > 0) await redis.del(...keys);
}

await clearRateKeys();

const statuses = [];
for (let i = 0; i < 4; i++) {
  const res = await fetch(`${BASE}/dev/rate-limit-probe`);
  statuses.push(res.status);
  if (i === 3) {
    const body = await res.json();
    check(
      "超过限额提示明确",
      String(body?.message ?? "").includes("请求过于频繁"),
      body?.message ?? "",
    );
  }
}

check("前 3 次 200", statuses.slice(0, 3).every((s) => s === 200), statuses.join(","));
check("第 4 次 429", statuses[3] === 429, `HTTP ${statuses[3]}`);

const health = await fetch(`${BASE}/health`);
check("健康检查不受限流影响", health.status === 200, `HTTP ${health.status}`);

await clearRateKeys();
await redis.quit();

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n全站 API 限流验收通过");
