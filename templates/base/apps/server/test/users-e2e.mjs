/**
 * 用户管理验收（平台管理员）。
 * 前置：server 启动、数据库已 seed。
 * 运行：`pnpm --filter @starter/server test:users`
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
    // ignore
  }
  return { status: res.status, json, text };
}

const anon = await request("GET", "/users");
check("未登录访问用户接口 401", anon.status === 401, `HTTP ${anon.status}`);

const sign = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("管理员登录成功", sign.status === 201, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;
check("拿到 accessToken", Boolean(token));
const adminId = token
  ? (() => {
      try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        return payload.sub ?? payload.userId ?? null;
      } catch {
        return null;
      }
    })()
  : null;

const list = await request("GET", "/users?pageSize=5", undefined, token);
check("用户列表 200", list.status === 200, `HTTP ${list.status}`);
check("用户列表非空", (list.json?.items?.length ?? 0) > 0, `total=${list.json?.total}`);

const email = `users-e2e-${Date.now()}@example.com`;
const password = "user_pwd_2026";
const created = await request(
  "POST",
  "/users",
  { email, displayName: "用户验收", password },
  token,
);
check("创建用户 201", created.status === 201, `HTTP ${created.status}`);
check("创建后状态 active", created.json?.status === "active", created.json?.status ?? "");
const userId = created.json?.id;

const duplicate = await request("POST", "/users", { email, password }, token);
check("重复邮箱 409", duplicate.status === 409, `HTTP ${duplicate.status}`);

const search = await request("GET", `/users?keyword=${encodeURIComponent(email)}`, undefined, token);
check("关键词搜索命中", (search.json?.total ?? 0) === 1, `total=${search.json?.total}`);

const userSign = await request("POST", "/auth/sign-in", { email, password });
check("新用户可登录", userSign.status === 201, `HTTP ${userSign.status}`);
const userToken = userSign.json?.accessToken;

if (userToken) {
  const forbidden = await request("GET", "/users", undefined, userToken);
  check("非平台管理员访问 403", forbidden.status === 403, `HTTP ${forbidden.status}`);
}

if (userId) {
  const updated = await request(
    "PATCH",
    `/users/${userId}`,
    { displayName: "用户验收（改名）", status: "disabled" },
    token,
  );
  check("更新用户 200", updated.status === 200, `HTTP ${updated.status}`);
  check("更新后状态 disabled", updated.json?.status === "disabled", updated.json?.status ?? "");

  const disabledSign = await request("POST", "/auth/sign-in", { email, password });
  check("禁用用户不能登录", disabledSign.status === 401, `HTTP ${disabledSign.status}`);

  const detail = await request("GET", `/users/${userId}`, undefined, token);
  check("用户详情 200", detail.status === 200, `HTTP ${detail.status}`);
  check("详情不含密码哈希", !detail.text.includes("passwordHash"));
  check("租户数 0", detail.json?.tenantCount === 0, `tenantCount=${detail.json?.tenantCount}`);

  if (adminId) {
    const selfDelete = await request("DELETE", `/users/${adminId}`, undefined, token);
    check("不能删除当前用户 403", selfDelete.status === 403, `HTTP ${selfDelete.status}`);
  }

  const removed = await request("DELETE", `/users/${userId}`, undefined, token);
  check("删除用户 204", removed.status === 204, `HTTP ${removed.status}`);

  const afterDelete = await request("GET", `/users/${userId}`, undefined, token);
  check("删除后详情 404", afterDelete.status === 404, `HTTP ${afterDelete.status}`);
}

const badId = await request("GET", "/users/not-a-uuid", undefined, token);
check("非法 id 400", badId.status === 400, `HTTP ${badId.status}`);

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n用户管理验收通过");
