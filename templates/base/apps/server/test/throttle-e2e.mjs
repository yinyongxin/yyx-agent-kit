/**
 * 登录失败锁定验收（Redis）。
 * 前置：server 启动、数据库已 seed、Redis 可用。
 * 运行：`pnpm --filter @starter/server test:throttle`
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
const EMAIL = process.env.SEED_USER_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.SEED_USER_PASSWORD ?? "seed_pwd_2026";
const MAX_ATTEMPTS = Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS ?? 5);

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` · ${detail}` : ""}`);
  if (!ok) failed++;
};

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // 保留原文
  }
  return { status: res.status, json, text };
}

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:46379");

async function clearThrottleKeys() {
  const keys = await redis.keys("auth:login:*");
  if (keys.length > 0) await redis.del(...keys);
}

await clearThrottleKeys();

const adminLogin = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("管理员正常登录 201", adminLogin.status === 201, `HTTP ${adminLogin.status}`);

const email = `throttle-${Date.now()}@example.com`;
let lastStatus = 0;
for (let i = 0; i < MAX_ATTEMPTS; i++) {
  const res = await request("POST", "/auth/sign-in", {
    email,
    password: "wrong_password",
  });
  lastStatus = res.status;
}
check(
  `前 ${MAX_ATTEMPTS} 次失败 401`,
  lastStatus === 401,
  `HTTP ${lastStatus}`,
);

const locked = await request("POST", "/auth/sign-in", {
  email,
  password: "wrong_password",
});
check("达到上限后 429", locked.status === 429, `HTTP ${locked.status}`);
check(
  "429 提示明确",
  String(locked.json?.message ?? "").includes("登录失败次数过多"),
  locked.json?.message ?? "",
);

const adminAfter = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("其他用户仍可登录 201", adminAfter.status === 201, `HTTP ${adminAfter.status}`);

await clearThrottleKeys();
await redis.quit();

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n登录失败锁定验收通过");
