/**
 * 链路追踪验收（OTel → Tempo）。
 * 前置：server 已启动且 `OTEL_ENABLED=true`；`docker compose --profile observability up -d tempo`。
 * 运行：`pnpm --filter @starter/server test:traces`
 *
 * Tempo 不可达 / 未收到 trace 时 SKIP（不算失败），便于只跑主业务回归。
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
const TEMPO = process.env.TEMPO_URL ?? "http://localhost:47113";
const EMAIL = process.env.SEED_USER_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.SEED_USER_PASSWORD ?? "seed_pwd_2026";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` · ${detail}` : ""}`);
  if (!ok) failed++;
};

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const fetchTrace = async (traceId) => {
  const res = await fetch(`${TEMPO}/api/traces/${traceId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Tempo HTTP ${res.status}`);
  return res.json();
};

const listSpans = (trace) => {
  const spans = [];
  for (const batch of trace?.batches ?? []) {
    for (const scope of batch.scopeSpans ?? []) {
      for (const span of scope.spans ?? []) spans.push(span);
    }
  }
  return spans;
};

// Tempo 返回 OTLP JSON：traceId / spanId 是 base64，需要把 hex 转过去比较
const hexToBase64 = (hex) => Buffer.from(hex, "hex").toString("base64");

// 1. Tempo 是否可用
try {
  const ready = await fetch(`${TEMPO}/ready`);
  if (!ready.ok) {
    console.log("\nSKIP Tempo 未就绪（先 docker compose --profile observability up -d tempo）");
    process.exit(0);
  }
} catch {
  console.log("\nSKIP Tempo 不可达（先 docker compose --profile observability up -d tempo）");
  process.exit(0);
}

// 2. 健康检查：生成 trace 并等待导出
const health = await fetch(`${BASE}/health`);
check("health 200", health.status === 200, `HTTP ${health.status}`);
const traceId = health.headers.get("x-trace-id");
check("响应头带 traceId", Boolean(traceId && /^[0-9a-f]{32}$/.test(traceId)), traceId ?? "");

if (!traceId) process.exit(1);

await sleep(6000);
let trace = await fetchTrace(traceId);
check("Tempo 收到 health trace", Boolean(trace), traceId);

if (trace) {
  const spans = listSpans(trace);
  check("包含 server span", spans.some((span) => span.name.endsWith("/api/health")));
  check(
    "所有 span traceId 一致",
    spans.every((span) => span.traceId === hexToBase64(traceId)),
  );
  const server = spans.find((span) => span.name.endsWith("/api/health"));
  const attrs = Object.fromEntries(
    (server?.attributes ?? []).map((attr) => [
      attr.key,
      attr.value?.stringValue ?? attr.value?.intValue,
    ]),
  );
  check("server span 记录状态码", String(attrs["http.response.status_code"]) === "200");
}

// 3. 入站 traceparent 复用
const incoming = "4bf92f3577b34da6a3ce929d0e0e4736";
const reused = await fetch(`${BASE}/health`, {
  headers: { traceparent: `00-${incoming}-00f067aa0ba902b7-01` },
});
check(
  "入站 traceparent 被复用",
  reused.headers.get("x-trace-id") === incoming,
  reused.headers.get("x-trace-id") ?? "",
);

// 4. 登录请求：应有 pg 子 span
const signIn = await fetch(`${BASE}/auth/sign-in`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
check("登录成功", signIn.status === 201, `HTTP ${signIn.status}`);
const signInTraceId = signIn.headers.get("x-trace-id");
check("登录响应带 traceId", Boolean(signInTraceId));

if (signInTraceId) {
  await sleep(6000);
  const signInTrace = await fetchTrace(signInTraceId);
  check("Tempo 收到登录 trace", Boolean(signInTrace), signInTraceId);
  if (signInTrace) {
    const spans = listSpans(signInTrace);
    check("包含 POST /api/auth/sign-in", spans.some((span) => span.name.includes("/api/auth/sign-in")));
    check(
      "包含数据库子 span",
      spans.some((span) => span.name.startsWith("pg.query")),
      spans.map((span) => span.name).join(", "),
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n链路追踪验收通过");
