/**
 * 平台权限点管理验收。
 * 前置：server 启动、数据库已 seed（admin@example.com 为平台管理员）。
 * 运行：`pnpm --filter @starter/server test:permissions`
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

const anon = await request("GET", "/permissions");
check("未登录访问权限点 401", anon.status === 401, `HTTP ${anon.status}`);

const sign = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("管理员登录成功", sign.status === 201, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;

const initial = await request("GET", "/permissions?pageSize=50", undefined, token);
check("权限点列表 200", initial.status === 200, `HTTP ${initial.status}`);
const seedPermission = initial.json?.items?.find((item) => item.code === "knowledge:read");
check("包含 seed 权限点", Boolean(seedPermission), seedPermission?.code ?? "");
check(
  "seed 权限点有角色引用",
  (seedPermission?.roleCount ?? 0) > 0,
  `roleCount=${seedPermission?.roleCount}`,
);

const suffix = Date.now();
const code = `e2e:test${suffix}`;

const created = await request(
  "POST",
  "/permissions",
  { code, name: "E2E 权限", description: "权限点验收" },
  token,
);
check("创建权限点 201", created.status === 201, `HTTP ${created.status}`);
check("创建后角色数 0", created.json?.roleCount === 0, `roleCount=${created.json?.roleCount}`);
const permissionId = created.json?.id;

const duplicate = await request(
  "POST",
  "/permissions",
  { code, name: "重复权限" },
  token,
);
check("重复 code 409", duplicate.status === 409, `HTTP ${duplicate.status}`);

const badCode = await request(
  "POST",
  "/permissions",
  { code: "BadCode", name: "非法 code" },
  token,
);
check("非法 code 400", badCode.status === 400, `HTTP ${badCode.status}`);

const search = await request(
  "GET",
  `/permissions?keyword=${encodeURIComponent(code)}`,
  undefined,
  token,
);
check("关键词搜索命中", search.json?.total === 1, `total=${search.json?.total}`);

const detail = await request("GET", `/permissions/${permissionId}`, undefined, token);
check("权限点详情 200", detail.status === 200, `HTTP ${detail.status}`);

const updated = await request(
  "PATCH",
  `/permissions/${permissionId}`,
  { name: "E2E 权限（改）", description: "已更新" },
  token,
);
check("更新权限点 200", updated.status === 200, `HTTP ${updated.status}`);
check("更新后名称正确", updated.json?.name === "E2E 权限（改）", updated.json?.name ?? "");

const emptyUpdate = await request(
  "PATCH",
  `/permissions/${permissionId}`,
  {},
  token,
);
check("空更新 400", emptyUpdate.status === 400, `HTTP ${emptyUpdate.status}`);

// 租户侧权限目录应同步出现新权限点
const myTenants = await request("GET", "/me/tenants", undefined, token);
const tenantId =
  myTenants.json?.find((item) => item.slug === "default")?.id ??
  myTenants.json?.[0]?.id ??
  DEFAULT_TENANT_ID;
const tenantCatalog = await request("GET", `/t/${tenantId}/permissions`, undefined, token);
check(
  "租户权限目录包含新权限点",
  Boolean(tenantCatalog.json?.some((item) => item.code === code)),
  `HTTP ${tenantCatalog.status}`,
);

// 普通用户不是平台管理员，不能访问权限点管理
const userEmail = `perm-user-${suffix}@example.com`;
const userPassword = "perm_user_pwd_2026";
const createdUser = await request(
  "POST",
  "/users",
  { email: userEmail, password: userPassword },
  token,
);
check("准备普通用户 201", createdUser.status === 201, `HTTP ${createdUser.status}`);
const userSign = await request("POST", "/auth/sign-in", {
  email: userEmail,
  password: userPassword,
});
const userToken = userSign.json?.accessToken;
if (userToken) {
  const forbidden = await request("GET", "/permissions", undefined, userToken);
  check("非平台管理员 403", forbidden.status === 403, `HTTP ${forbidden.status}`);
}

if (seedPermission?.id) {
  const inUse = await request("DELETE", `/permissions/${seedPermission.id}`, undefined, token);
  check("被角色引用的权限点不可删 409", inUse.status === 409, `HTTP ${inUse.status}`);
}

const badId = await request("GET", "/permissions/not-a-uuid", undefined, token);
check("非法 id 400", badId.status === 400, `HTTP ${badId.status}`);

const removed = await request("DELETE", `/permissions/${permissionId}`, undefined, token);
check("删除权限点 204", removed.status === 204, `HTTP ${removed.status}`);

const afterDelete = await request(
  "GET",
  `/permissions?keyword=${encodeURIComponent(code)}`,
  undefined,
  token,
);
check("删除后列表为空", afterDelete.json?.total === 0, `total=${afterDelete.json?.total}`);

const tenantAfter = await request("GET", `/t/${tenantId}/permissions`, undefined, token);
check(
  "租户目录同步移除",
  !tenantAfter.json?.some((item) => item.code === code),
  `HTTP ${tenantAfter.status}`,
);

const deletedDetail = await request("GET", `/permissions/${permissionId}`, undefined, token);
check("删除后详情 404", deletedDetail.status === 404, `HTTP ${deletedDetail.status}`);

if (createdUser.json?.id) {
  const cleanup = await request("DELETE", `/users/${createdUser.json.id}`, undefined, token);
  check("清理临时用户 204", cleanup.status === 204, `HTTP ${cleanup.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n权限点管理验收通过");
