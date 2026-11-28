/**
 * 日志查询 API 验收（Loki 只读接口）。
 * 前置：server 已启动、数据库已 seed、`docker compose up -d`（默认含 Loki）。
 * 运行：`pnpm --filter @starter/server test:logs`
 *
 * Loki 不可达时整组跳过（不算失败），便于只跑主业务回归。
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
    json = JSON.parse(text);
  } catch {
    // 非 JSON 响应保留原文
  }
  return { status: res.status, json, text, headers: res.headers };
}

const sign = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("登录成功", sign.status === 201 || sign.status === 200, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;
check("拿到 accessToken", Boolean(token));

const unauthorized = await request("GET", "/logs");
check("未登录访问日志接口 401", unauthorized.status === 401, `HTTP ${unauthorized.status}`);

const list = await request("GET", "/logs?range=24h&pageSize=5", undefined, token);
if (list.status === 502 || list.status === 503) {
  console.log("\nSKIP Loki 不可达（执行 docker compose up -d）");
  process.exit(0);
}

check("日志列表 200", list.status === 200, `HTTP ${list.status}`);
check("响应头带 X-Trace-Id", Boolean(list.headers.get("x-trace-id")));
check("items 是数组", Array.isArray(list.json?.items));
check("至少一条日志", (list.json?.items?.length ?? 0) > 0, `count=${list.json?.items?.length}`);

const first = list.json?.items?.[0];
if (first) {
  check("日志有 timestamp", typeof first.timestamp === "string" && !Number.isNaN(Date.parse(first.timestamp)));
  check("日志有 level", typeof first.level === "string" && first.level.length > 0, first.level);
  check("日志有 raw", first.raw !== null && typeof first.raw === "object");
  check("成功日志密码/令牌已脱敏", !JSON.stringify(first.raw).includes("seed_pwd_2026"));
}

const stats = await request("GET", "/logs/stats?range=24h", undefined, token);
check("日志统计 200", stats.status === 200, `HTTP ${stats.status}`);
check("统计有 total", typeof stats.json?.total === "number", `total=${stats.json?.total}`);
check(
  "levels 与 counts 等长",
  Array.isArray(stats.json?.levels) &&
    Array.isArray(stats.json?.counts) &&
    stats.json.levels.length === stats.json.counts.length,
);

const level = first?.level;
const filtered = await request("GET", `/logs?range=24h&level=${level}&pageSize=5`, undefined, token);
check("按级别过滤 200", filtered.status === 200, `HTTP ${filtered.status}`);
check(
  "按级别过滤结果级别一致",
  (filtered.json?.items ?? []).every((item) => item.level === level),
  `level=${level}`,
);

const badTrace = await request("GET", "/logs/trace/not-a-trace-id", undefined, token);
check("非法 traceId 400", badTrace.status === 400, `HTTP ${badTrace.status}`);

if (first?.traceId) {
  const trace = await request("GET", `/logs/trace/${first.traceId}`, undefined, token);
  check("trace 时间线 200", trace.status === 200, `HTTP ${trace.status}`);
  check("trace 时间线非空", Array.isArray(trace.json) && trace.json.length > 0);
  check(
    "trace 时间线 traceId 一致",
    (trace.json ?? []).every((item) => item.traceId === first.traceId),
  );
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n日志查询验收通过");
