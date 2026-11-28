/**
 * 登录设备 / 服务端会话验收。
 * 前置：server 启动、数据库已 seed。
 * 运行：`pnpm --filter @starter/server test:sessions`
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
    json = text ? JSON.parse(text) : null;
  } catch {
    // 保留原文
  }
  return { status: res.status, json, text };
}

const admin = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
const adminToken = admin.json?.accessToken;

const suffix = Date.now();
const email = `session-e2e-${suffix}@example.com`;
const password = "session_pwd_2026";
const created = await request(
  "POST",
  "/users",
  { email, displayName: "会话验收", password },
  adminToken,
);
check("准备用户 201", created.status === 201, `HTTP ${created.status}`);
const userId = created.json?.id;

const loginA = await request("POST", "/auth/sign-in", { email, password });
const loginB = await request("POST", "/auth/sign-in", { email, password });
const tokenA = loginA.json?.accessToken;
const tokenB = loginB.json?.accessToken;
check("登录两次成功", loginA.status === 201 && loginB.status === 201, `${loginA.status},${loginB.status}`);

const listA = await request("GET", "/me/sessions", undefined, tokenA);
check("会话列表 200", listA.status === 200, `HTTP ${listA.status}`);
check("至少两个会话", (listA.json?.length ?? 0) >= 2, `count=${listA.json?.length}`);
check(
  "恰好一个 current",
  (listA.json ?? []).filter((item) => item.current).length === 1,
  JSON.stringify((listA.json ?? []).filter((item) => item.current).map((item) => item.id)),
);

const currentId = (listA.json ?? []).find((item) => item.current)?.id;
const other = (listA.json ?? []).find((item) => !item.current);
check("存在其他会话", Boolean(other), other?.id ?? "");

if (other) {
  const revoked = await request(
    "DELETE",
    `/me/sessions/${other.id}`,
    undefined,
    tokenA,
  );
  check("撤销其他会话 204", revoked.status === 204, `HTTP ${revoked.status}`);

  const revokedMe = await request("GET", "/me", undefined, tokenB);
  check("被撤销会话立即 401", revokedMe.status === 401, `HTTP ${revokedMe.status}`);

  const currentMe = await request("GET", "/me", undefined, tokenA);
  check("当前会话仍可用", currentMe.status === 200, `HTTP ${currentMe.status}`);
}

const loginC = await request("POST", "/auth/sign-in", { email, password });
const tokenC = loginC.json?.accessToken;
const revokeOthers = await request(
  "POST",
  "/me/sessions/revoke-others",
  undefined,
  tokenA,
);
check("退出其他设备 204", revokeOthers.status === 204, `HTTP ${revokeOthers.status}`);

const listAfter = await request("GET", "/me/sessions", undefined, tokenA);
check("只剩当前会话", listAfter.json?.length === 1, `count=${listAfter.json?.length}`);
check("当前会话 id 未变", listAfter.json?.[0]?.id === currentId, listAfter.json?.[0]?.id ?? "");

if (tokenC) {
  const revokedC = await request("GET", "/me", undefined, tokenC);
  check("被退出设备的会话 401", revokedC.status === 401, `HTTP ${revokedC.status}`);
}

const badId = await request("DELETE", "/me/sessions/not-a-session", undefined, tokenA);
check("未知会话 404", badId.status === 404, `HTTP ${badId.status}`);

if (userId) {
  const cleanup = await request("DELETE", `/users/${userId}`, undefined, adminToken);
  check("清理测试用户 204", cleanup.status === 204, `HTTP ${cleanup.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n登录设备 / 会话验收通过");
