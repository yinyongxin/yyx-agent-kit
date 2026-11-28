/**
 * 接口级权限校验验收：@RequirePermission 与角色权限并集。
 * 前置：server 启动、数据库已 seed（admin@example.com 为平台管理员）。
 * 运行：`pnpm --filter @starter/server test:authz`
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
const adminToken = sign.json?.accessToken;

const myTenants = await request("GET", "/me/tenants", undefined, adminToken);
const tenantId =
  myTenants.json?.find((item) => item.slug === "default")?.id ??
  myTenants.json?.[0]?.id ??
  DEFAULT_TENANT_ID;

const base = `/t/${tenantId}`;
const rolesPath = `${base}/roles`;
const membersPath = `${base}/members`;

const adminMembership = await request("GET", `${base}/membership`, undefined, adminToken);
check(
  "管理员 membership 权限为通配 *",
  Array.isArray(adminMembership.json?.permissions) &&
    adminMembership.json.permissions.includes("*"),
  JSON.stringify(adminMembership.json?.permissions ?? []),
);

const adminMe = await request("GET", "/me", undefined, adminToken);
check(
  "管理员 /me 标记为平台管理员",
  adminMe.status === 200 && adminMe.json?.isPlatformAdmin === true,
  `HTTP ${adminMe.status}, isPlatformAdmin=${adminMe.json?.isPlatformAdmin}`,
);

const suffix = Date.now();
const userEmail = `authz-user-${suffix}@example.com`;
const userPassword = "authz_user_pwd_2026";
const writerCode = `authz-writer-${suffix}`;
const createdCode = `authz-created-${suffix}`;

const createdUser = await request(
  "POST",
  "/users",
  { email: userEmail, displayName: "权限校验用户", password: userPassword },
  adminToken,
);
check("准备用户 201", createdUser.status === 201, `HTTP ${createdUser.status}`);
const userId = createdUser.json?.id;

const added = await request("POST", membersPath, { email: userEmail }, adminToken);
check("加入默认租户 201", added.status === 201, `HTTP ${added.status}`);

const userSign = await request("POST", "/auth/sign-in", {
  email: userEmail,
  password: userPassword,
});
check("成员登录成功", userSign.status === 201, `HTTP ${userSign.status}`);
const userToken = userSign.json?.accessToken;

const memberMembership = await request("GET", `${base}/membership`, undefined, userToken);
check(
  "普通成员 membership 权限来自角色并集",
  Array.isArray(memberMembership.json?.permissions) &&
    memberMembership.json.permissions.includes("role:read") &&
    memberMembership.json.permissions.includes("user:read") &&
    !memberMembership.json.permissions.includes("*"),
  JSON.stringify(memberMembership.json?.permissions ?? []),
);

const memberMe = await request("GET", "/me", undefined, userToken);
check(
  "普通成员 /me 非平台管理员",
  memberMe.status === 200 && memberMe.json?.isPlatformAdmin === false,
  `HTTP ${memberMe.status}, isPlatformAdmin=${memberMe.json?.isPlatformAdmin}`,
);

const memberRoles = await request("GET", rolesPath, undefined, userToken);
check("有 role:read 可读角色 200", memberRoles.status === 200, `HTTP ${memberRoles.status}`);

const memberCreateRole = await request(
  "POST",
  rolesPath,
  { code: `authz-denied-${suffix}`, name: "越权角色" },
  userToken,
);
check("缺少 role:write 建角色 403", memberCreateRole.status === 403, `HTTP ${memberCreateRole.status}`);
check(
  "403 提示缺少权限",
  String(memberCreateRole.json?.message ?? "").includes("role:write"),
  memberCreateRole.json?.message ?? "",
);

const memberMembers = await request("GET", membersPath, undefined, userToken);
check("有 user:read 可读成员 200", memberMembers.status === 200, `HTTP ${memberMembers.status}`);

const adminMemberId = memberMembers.json?.items?.find((item) => item.email === EMAIL)?.userId;
if (adminMemberId) {
  const memberUpdate = await request(
    "PATCH",
    `${membersPath}/${adminMemberId}`,
    { status: "suspended" },
    userToken,
  );
  check("缺少 user:write 改成员 403", memberUpdate.status === 403, `HTTP ${memberUpdate.status}`);
}

// 管理员创建带 role:write 的自定义角色并分配给成员
const writerRole = await request(
  "POST",
  rolesPath,
  {
    code: writerCode,
    name: "权限写入者",
    permissionCodes: ["role:read", "role:write"],
  },
  adminToken,
);
check("创建 role:write 角色 201", writerRole.status === 201, `HTTP ${writerRole.status}`);

const assigned = await request(
  "PATCH",
  `${membersPath}/${userId}`,
  { roleCodes: [writerCode] },
  adminToken,
);
check("分配自定义角色 200", assigned.status === 200, `HTTP ${assigned.status}`);

// 同一个 token，权限按请求实时计算；无需重新登录
const grantedCreate = await request(
  "POST",
  rolesPath,
  { code: createdCode, name: "权限创建的角" },
  userToken,
);
check(
  "获得 role:write 后可建角色 201",
  grantedCreate.status === 201,
  `HTTP ${grantedCreate.status}`,
);
const grantedRoleId = grantedCreate.json?.id;

const grantedDelete = await request(
  "DELETE",
  `${rolesPath}/${grantedRoleId}`,
  undefined,
  userToken,
);
check("获得 role:write 后可删角色 204", grantedDelete.status === 204, `HTTP ${grantedDelete.status}`);

// 清理
const removed = await request("DELETE", `${membersPath}/${userId}`, undefined, adminToken);
check("移除成员 204", removed.status === 204, `HTTP ${removed.status}`);

const cleanupUser = await request("DELETE", `/users/${userId}`, undefined, adminToken);
check("清理用户 204", cleanupUser.status === 204, `HTTP ${cleanupUser.status}`);

const cleanupRole = await request(
  "DELETE",
  `${rolesPath}/${writerRole.json?.id}`,
  undefined,
  adminToken,
);
check("清理自定义角色 204", cleanupRole.status === 204, `HTTP ${cleanupRole.status}`);

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n接口级权限校验验收通过");
