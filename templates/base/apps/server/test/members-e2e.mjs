/**
 * 租户成员管理验收。
 * 前置：server 启动、数据库已 seed（默认租户 admin@example.com）。
 * 运行：`pnpm --filter @starter/server test:members`
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
const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

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

const anon = await request("GET", `/t/${DEFAULT_TENANT_ID}/members`);
check("未登录访问成员接口 401", anon.status === 401, `HTTP ${anon.status}`);

const sign = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("管理员登录成功", sign.status === 201, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;
check("拿到 accessToken", Boolean(token));

const myTenants = await request("GET", "/me/tenants", undefined, token);
const tenantId =
  myTenants.json?.find((item) => item.slug === "default")?.id ??
  myTenants.json?.[0]?.id ??
  DEFAULT_TENANT_ID;
check("解析默认租户 id", Boolean(tenantId), tenantId);

const base = `/t/${tenantId}/members`;

const initial = await request("GET", `${base}?pageSize=50`, undefined, token);
check("成员列表 200", initial.status === 200, `HTTP ${initial.status}`);
const adminMember = initial.json?.items?.find((item) => item.email === EMAIL);
check("列表包含管理员", Boolean(adminMember), `total=${initial.json?.total}`);
check(
  "管理员角色含 admin",
  Boolean(adminMember?.roles?.some((role) => role.code === "admin")),
  JSON.stringify(adminMember?.roles ?? []),
);
const adminId = adminMember?.userId;

const email = `members-e2e-${Date.now()}@example.com`;
const password = "member_pwd_2026";

const createdUser = await request(
  "POST",
  "/users",
  { email, displayName: "成员验收", password },
  token,
);
check("准备用户 201", createdUser.status === 201, `HTTP ${createdUser.status}`);
const userId = createdUser.json?.id;

const added = await request("POST", base, { email }, token);
check("添加成员 201", added.status === 201, `HTTP ${added.status}`);
check("默认角色 member", added.json?.roles?.[0]?.code === "member", JSON.stringify(added.json?.roles ?? []));
check("成员状态 active", added.json?.status === "active", added.json?.status ?? "");

const duplicate = await request("POST", base, { email }, token);
check("重复添加 409", duplicate.status === 409, `HTTP ${duplicate.status}`);

const unknownUser = await request(
  "POST",
  base,
  { email: `missing-${Date.now()}@example.com` },
  token,
);
check("未知用户 404", unknownUser.status === 404, `HTTP ${unknownUser.status}`);

const search = await request(
  "GET",
  `${base}?keyword=${encodeURIComponent(email)}`,
  undefined,
  token,
);
check("关键词搜索命中", search.json?.total === 1, `total=${search.json?.total}`);

const userSign = await request("POST", "/auth/sign-in", { email, password });
check("新成员可登录", userSign.status === 201, `HTTP ${userSign.status}`);
const memberToken = userSign.json?.accessToken;

if (memberToken) {
  const memberRead = await request("GET", base, undefined, memberToken);
  check("普通成员可查看列表", memberRead.status === 200, `HTTP ${memberRead.status}`);

  const memberWrite = await request(
    "PATCH",
    `${base}/${adminId}`,
    { status: "suspended" },
    memberToken,
  );
  check("普通成员不能改成员 403", memberWrite.status === 403, `HTTP ${memberWrite.status}`);
}

const badRole = await request(
  "PATCH",
  `${base}/${userId}`,
  { roleCodes: ["not-a-role"] },
  token,
);
check("未知角色 400", badRole.status === 400, `HTTP ${badRole.status}`);

const promoted = await request(
  "PATCH",
  `${base}/${userId}`,
  { roleCodes: ["admin"], status: "suspended" },
  token,
);
check("更新角色与状态 200", promoted.status === 200, `HTTP ${promoted.status}`);
check("角色变为 admin", promoted.json?.roles?.[0]?.code === "admin", JSON.stringify(promoted.json?.roles ?? []));
check("状态变为 suspended", promoted.json?.status === "suspended", promoted.json?.status ?? "");

if (memberToken) {
  const suspendedRead = await request("GET", base, undefined, memberToken);
  check("租户内停用后访问 404", suspendedRead.status === 404, `HTTP ${suspendedRead.status}`);
}

const reactivated = await request(
  "PATCH",
  `${base}/${userId}`,
  { roleCodes: ["member"], status: "active" },
  token,
);
check("恢复成员 200", reactivated.status === 200, `HTTP ${reactivated.status}`);
check("恢复后状态 active", reactivated.json?.status === "active", reactivated.json?.status ?? "");

if (adminId) {
  const selfUpdate = await request(
    "PATCH",
    `${base}/${adminId}`,
    { status: "suspended" },
    token,
  );
  check("不能修改自己 403", selfUpdate.status === 403, `HTTP ${selfUpdate.status}`);

  const selfRemove = await request("DELETE", `${base}/${adminId}`, undefined, token);
  check("不能移除自己 403", selfRemove.status === 403, `HTTP ${selfRemove.status}`);
}

const emptyUpdate = await request("PATCH", `${base}/${userId}`, {}, token);
check("空更新 400", emptyUpdate.status === 400, `HTTP ${emptyUpdate.status}`);

const removed = await request("DELETE", `${base}/${userId}`, undefined, token);
check("移除成员 204", removed.status === 204, `HTTP ${removed.status}`);

const afterRemove = await request(
  "GET",
  `${base}?keyword=${encodeURIComponent(email)}`,
  undefined,
  token,
);
check("移除后列表为空", afterRemove.json?.total === 0, `total=${afterRemove.json?.total}`);

const removeAgain = await request("DELETE", `${base}/${userId}`, undefined, token);
check("重复移除 404", removeAgain.status === 404, `HTTP ${removeAgain.status}`);

const badUserId = await request("DELETE", `${base}/not-a-uuid`, undefined, token);
check("非法 userId 400", badUserId.status === 400, `HTTP ${badUserId.status}`);

// 清理：删除临时用户（此时已不属于任何租户）
if (createdUser.json?.id) {
  const cleanup = await request("DELETE", `/users/${createdUser.json.id}`, undefined, token);
  check("清理临时用户 204", cleanup.status === 204, `HTTP ${cleanup.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n租户成员管理验收通过");
