/**
 * 租户角色管理验收。
 * 前置：server 启动、数据库已 seed（默认租户 admin@example.com）。
 * 运行：`pnpm --filter @starter/server test:roles`
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

const sign = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("管理员登录成功", sign.status === 201, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;

const myTenants = await request("GET", "/me/tenants", undefined, token);
const tenantId =
  myTenants.json?.find((item) => item.slug === "default")?.id ??
  myTenants.json?.[0]?.id ??
  DEFAULT_TENANT_ID;

const rolesPath = `/t/${tenantId}/roles`;
const membersPath = `/t/${tenantId}/members`;

const anon = await request("GET", rolesPath);
check("未登录访问角色 401", anon.status === 401, `HTTP ${anon.status}`);

const initial = await request("GET", `${rolesPath}?pageSize=50`, undefined, token);
check("角色列表 200", initial.status === 200, `HTTP ${initial.status}`);
const adminRole = initial.json?.items?.find((item) => item.code === "admin");
const memberRole = initial.json?.items?.find((item) => item.code === "member");
check("包含内置 admin", Boolean(adminRole?.isSystem), adminRole?.code ?? "");
check("包含内置 member", Boolean(memberRole?.isSystem), memberRole?.code ?? "");

const permissions = await request("GET", `/t/${tenantId}/permissions`, undefined, token);
check("权限点目录 200", permissions.status === 200, `HTTP ${permissions.status}`);
check(
  "权限点包含 knowledge:read",
  Boolean(permissions.json?.some((item) => item.code === "knowledge:read")),
  `count=${permissions.json?.length}`,
);

const suffix = Date.now();
const code = `e2e-role-${suffix}`;
const password = "role_member_pwd_2026";

const created = await request(
  "POST",
  rolesPath,
  {
    code,
    name: "E2E 角色",
    description: "角色验收",
    permissionCodes: ["knowledge:read"],
  },
  token,
);
check("创建自定义角色 201", created.status === 201, `HTTP ${created.status}`);
check("创建后非内置", created.json?.isSystem === false, String(created.json?.isSystem));
check("权限数 1", created.json?.permissionCount === 1, `count=${created.json?.permissionCount}`);
const roleId = created.json?.id;

const duplicate = await request(
  "POST",
  rolesPath,
  { code, name: "重复角色" },
  token,
);
check("重复 code 409", duplicate.status === 409, `HTTP ${duplicate.status}`);

const badPermission = await request(
  "POST",
  rolesPath,
  { code: `${code}-bad`, name: "坏权限", permissionCodes: ["not:exist"] },
  token,
);
check("未知权限点 400", badPermission.status === 400, `HTTP ${badPermission.status}`);

const badCode = await request(
  "POST",
  rolesPath,
  { code: "Bad_Code", name: "非法 code" },
  token,
);
check("非法 code 400", badCode.status === 400, `HTTP ${badCode.status}`);

const search = await request(
  "GET",
  `${rolesPath}?keyword=${encodeURIComponent(code)}`,
  undefined,
  token,
);
check("关键词搜索命中", search.json?.total === 1, `total=${search.json?.total}`);

const options = await request("GET", `${rolesPath}/options`, undefined, token);
check(
  "角色选项包含新角色",
  Boolean(options.json?.some((item) => item.code === code)),
  `HTTP ${options.status}`,
);

const detail = await request("GET", `${rolesPath}/${roleId}`, undefined, token);
check("角色详情 200", detail.status === 200, `HTTP ${detail.status}`);
check(
  "详情含权限 code",
  detail.json?.permissionCodes?.includes("knowledge:read"),
  JSON.stringify(detail.json?.permissionCodes ?? []),
);

const updated = await request(
  "PATCH",
  `${rolesPath}/${roleId}`,
  {
    name: "E2E 角色（改）",
    permissionCodes: ["knowledge:read", "knowledge:write"],
  },
  token,
);
check("更新角色 200", updated.status === 200, `HTTP ${updated.status}`);
check("权限数变为 2", updated.json?.permissionCount === 2, `count=${updated.json?.permissionCount}`);

const emptyUpdate = await request("PATCH", `${rolesPath}/${roleId}`, {}, token);
check("空更新 400", emptyUpdate.status === 400, `HTTP ${emptyUpdate.status}`);

if (adminRole?.id) {
  const systemUpdate = await request(
    "PATCH",
    `${rolesPath}/${adminRole.id}`,
    { name: "改内置角色" },
    token,
  );
  check("内置角色不可改 403", systemUpdate.status === 403, `HTTP ${systemUpdate.status}`);

  const systemDelete = await request("DELETE", `${rolesPath}/${adminRole.id}`, undefined, token);
  check("内置角色不可删 403", systemDelete.status === 403, `HTTP ${systemDelete.status}`);
}

const badId = await request("GET", `${rolesPath}/not-a-uuid`, undefined, token);
check("非法 roleId 400", badId.status === 400, `HTTP ${badId.status}`);

// 普通成员：只读 + 不能写角色
const memberEmail = `role-member-${suffix}@example.com`;
const createdUser = await request(
  "POST",
  "/users",
  { email: memberEmail, displayName: "角色验收成员", password },
  token,
);
check("准备成员用户 201", createdUser.status === 201, `HTTP ${createdUser.status}`);
const userId = createdUser.json?.id;

const added = await request("POST", membersPath, { email: memberEmail }, token);
check("添加成员 201", added.status === 201, `HTTP ${added.status}`);

const memberSign = await request("POST", "/auth/sign-in", {
  email: memberEmail,
  password,
});
const memberToken = memberSign.json?.accessToken;
check("成员登录成功", memberSign.status === 201, `HTTP ${memberSign.status}`);

if (memberToken) {
  const memberRead = await request("GET", rolesPath, undefined, memberToken);
  check("普通成员可查看角色", memberRead.status === 200, `HTTP ${memberRead.status}`);

  const memberWrite = await request(
    "POST",
    rolesPath,
    { code: `member-try-${suffix}`, name: "越权角色" },
    memberToken,
  );
  check("普通成员不能建角色 403", memberWrite.status === 403, `HTTP ${memberWrite.status}`);
}

// 把成员改成自定义角色，验证删除保护
const assigned = await request(
  "PATCH",
  `${membersPath}/${userId}`,
  { roleCodes: [code] },
  token,
);
check("成员分配到自定义角色 200", assigned.status === 200, `HTTP ${assigned.status}`);

const withUser = await request(
  "GET",
  `${rolesPath}?keyword=${encodeURIComponent(code)}`,
  undefined,
  token,
);
check(
  "角色成员数 1",
  withUser.json?.items?.[0]?.userCount === 1,
  `userCount=${withUser.json?.items?.[0]?.userCount}`,
);

const inUse = await request("DELETE", `${rolesPath}/${roleId}`, undefined, token);
check("有成员使用时不可删 409", inUse.status === 409, `HTTP ${inUse.status}`);

const removedMember = await request("DELETE", `${membersPath}/${userId}`, undefined, token);
check("移除成员 204", removedMember.status === 204, `HTTP ${removedMember.status}`);

const removed = await request("DELETE", `${rolesPath}/${roleId}`, undefined, token);
check("删除自定义角色 204", removed.status === 204, `HTTP ${removed.status}`);

const afterDelete = await request(
  "GET",
  `${rolesPath}?keyword=${encodeURIComponent(code)}`,
  undefined,
  token,
);
check("删除后列表为空", afterDelete.json?.total === 0, `total=${afterDelete.json?.total}`);

if (createdUser.json?.id) {
  const cleanup = await request("DELETE", `/users/${createdUser.json.id}`, undefined, token);
  check("清理临时用户 204", cleanup.status === 204, `HTTP ${cleanup.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n租户角色管理验收通过");
