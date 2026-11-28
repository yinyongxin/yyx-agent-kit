/**
 * 账号自助验收：个人资料、修改密码。
 * 前置：server 启动、数据库已 seed（admin@example.com 为平台管理员）。
 * 运行：`pnpm --filter @starter/server test:profile`
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

const anon = await request("PATCH", "/me", { displayName: "匿名" });
check("未登录改资料 401", anon.status === 401, `HTTP ${anon.status}`);

const admin = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
const adminToken = admin.json?.accessToken;

const suffix = Date.now();
const email = `profile-e2e-${suffix}@example.com`;
const oldPassword = "profile_old_2026";
const newPassword = "profile_new_2026";

const created = await request(
  "POST",
  "/users",
  { email, displayName: "账号验收", password: oldPassword },
  adminToken,
);
check("准备用户 201", created.status === 201, `HTTP ${created.status}`);
const userId = created.json?.id;

const sign = await request("POST", "/auth/sign-in", {
  email,
  password: oldPassword,
});
check("用户登录成功", sign.status === 201, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;

const me = await request("GET", "/me", undefined, token);
check("GET /me 200", me.status === 200, `HTTP ${me.status}`);
check("初始显示名正确", me.json?.displayName === "账号验收", me.json?.displayName ?? "");

const updated = await request(
  "PATCH",
  "/me",
  { displayName: "账号验收（改名）" },
  token,
);
check("修改显示名 200", updated.status === 200, `HTTP ${updated.status}`);
check(
  "显示名已更新",
  updated.json?.displayName === "账号验收（改名）",
  updated.json?.displayName ?? "",
);

const emptyName = await request("PATCH", "/me", { displayName: "" }, token);
check("空显示名 400", emptyName.status === 400, `HTTP ${emptyName.status}`);

const blankName = await request("PATCH", "/me", { displayName: "   " }, token);
check("纯空格显示名 400", blankName.status === 400, `HTTP ${blankName.status}`);

const changed = await request(
  "POST",
  "/me/password",
  { currentPassword: oldPassword, newPassword },
  token,
);
check("修改密码 204", changed.status === 204, `HTTP ${changed.status}`);

const oldLogin = await request("POST", "/auth/sign-in", {
  email,
  password: oldPassword,
});
check("旧密码不能登录 401", oldLogin.status === 401, `HTTP ${oldLogin.status}`);

const newLogin = await request("POST", "/auth/sign-in", {
  email,
  password: newPassword,
});
check("新密码可登录 201", newLogin.status === 201, `HTTP ${newLogin.status}`);
const newToken = newLogin.json?.accessToken;

if (newToken) {
  const wrongCurrent = await request(
    "POST",
    "/me/password",
    { currentPassword: oldPassword, newPassword: "another_pwd_2026" },
    newToken,
  );
  check("旧密码错误 400", wrongCurrent.status === 400, `HTTP ${wrongCurrent.status}`);

  const samePassword = await request(
    "POST",
    "/me/password",
    { currentPassword: newPassword, newPassword: newPassword },
    newToken,
  );
  check("新旧密码相同 400", samePassword.status === 400, `HTTP ${samePassword.status}`);

  const weakPassword = await request(
    "POST",
    "/me/password",
    { currentPassword: newPassword, newPassword: "short" },
    newToken,
  );
  check("弱密码 400", weakPassword.status === 400, `HTTP ${weakPassword.status}`);
}

if (userId) {
  const cleanup = await request("DELETE", `/users/${userId}`, undefined, adminToken);
  check("清理测试用户 204", cleanup.status === 204, `HTTP ${cleanup.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n账号自助验收通过");
