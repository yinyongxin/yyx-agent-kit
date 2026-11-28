/**
 * 租户引导验收：新租户角色初始化、初始管理员、平台级成员管理、最后管理员保护。
 * 前置：server 启动、数据库已 seed（admin@example.com 为 super 平台管理员）。
 * 运行：`pnpm --filter @starter/server test:provisioning`
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

const sign = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("管理员登录成功", sign.status === 201, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;

const me = await request("GET", "/me", undefined, token);
check(
  "管理员是 super 平台管理员",
  me.json?.isPlatformAdmin === true && me.json?.platformAdminLevel === "super",
  `level=${me.json?.platformAdminLevel}`,
);

const suffix = Date.now();
const slug = `prov-${suffix}`;

// 初始管理员邮箱不存在 → 事务回滚，不留下租户
const badCreate = await request(
  "POST",
  "/tenants",
  { name: "坏初始管理员", slug: `bad-${suffix}`, initialAdminEmail: `missing-${suffix}@example.com` },
  token,
);
check("初始管理员不存在 404", badCreate.status === 404, `HTTP ${badCreate.status}`);
const badList = await request(
  "GET",
  `/tenants?keyword=${encodeURIComponent(`bad-${suffix}`)}`,
  undefined,
  token,
);
check("失败后租户已回滚", badList.json?.total === 0, `total=${badList.json?.total}`);

// B：创建租户并指定初始管理员
const created = await request(
  "POST",
  "/tenants",
  { name: "引导验收租户", slug, initialAdminEmail: EMAIL },
  token,
);
check("创建租户（含初始管理员）201", created.status === 201, `HTTP ${created.status}`);
const tenantId = created.json?.id;
const tenantBase = `/tenants/${tenantId}`;

const roleOptions = await request(
  "GET",
  `${tenantBase}/roles/options`,
  undefined,
  token,
);
check("新租户自动创建 admin/member 角色", roleOptions.json?.length === 2, `count=${roleOptions.json?.length}`);
check(
  "角色包含 admin / member",
  Boolean(roleOptions.json?.some((role) => role.code === "admin")) &&
    Boolean(roleOptions.json?.some((role) => role.code === "member")),
  JSON.stringify((roleOptions.json ?? []).map((role) => role.code)),
);

const initialMembers = await request("GET", tenantBase + "/members", undefined, token);
check("平台级成员列表 200", initialMembers.status === 200, `HTTP ${initialMembers.status}`);
check("初始管理员已加入", initialMembers.json?.total === 1, `total=${initialMembers.json?.total}`);
const adminMember = initialMembers.json?.items?.find((item) => item.email === EMAIL);
check(
  "初始管理员拥有 admin 角色",
  Boolean(adminMember?.roles?.some((role) => role.code === "admin")),
  JSON.stringify(adminMember?.roles ?? []),
);

const membership = await request("GET", `/t/${tenantId}/membership`, undefined, token);
check("初始管理员可访问租户上下文", membership.status === 200, `HTTP ${membership.status}`);
check("租户内角色为 admin", membership.json?.role === "admin", membership.json?.role ?? "");

// 第二个用户 + 平台级成员管理
const userEmail = `prov-user-${suffix}@example.com`;
const userPassword = "prov_user_pwd_2026";
const createdUser = await request(
  "POST",
  "/users",
  { email: userEmail, displayName: "引导验收成员", password: userPassword },
  token,
);
check("准备第二用户 201", createdUser.status === 201, `HTTP ${createdUser.status}`);
const userId = createdUser.json?.id;

const added = await request(
  "POST",
  tenantBase + "/members",
  { email: userEmail, roleCodes: ["member"] },
  token,
);
check("平台级添加成员 201", added.status === 201, `HTTP ${added.status}`);

const userSign = await request("POST", "/auth/sign-in", {
  email: userEmail,
  password: userPassword,
});
const userToken = userSign.json?.accessToken;
if (userToken) {
  const forbidden = await request("GET", tenantBase + "/members", undefined, userToken);
  check("非平台管理员访问平台级成员 403", forbidden.status === 403, `HTTP ${forbidden.status}`);
}

// 最后管理员保护
const demoteOnlyAdmin = await request(
  "PATCH",
  `${tenantBase}/members/${adminMember?.userId}`,
  { roleCodes: ["member"] },
  token,
);
check("唯一管理员不可降级 409", demoteOnlyAdmin.status === 409, `HTTP ${demoteOnlyAdmin.status}`);

const removeOnlyAdmin = await request(
  "DELETE",
  `${tenantBase}/members/${adminMember?.userId}`,
  undefined,
  token,
);
check("仍有其他成员时不可移除唯一管理员 409", removeOnlyAdmin.status === 409, `HTTP ${removeOnlyAdmin.status}`);

const promote = await request(
  "PATCH",
  `${tenantBase}/members/${userId}`,
  { roleCodes: ["admin"] },
  token,
);
check("提升第二成员为 admin 200", promote.status === 200, `HTTP ${promote.status}`);

const demoteFirst = await request(
  "PATCH",
  `${tenantBase}/members/${adminMember?.userId}`,
  { roleCodes: ["member"] },
  token,
);
check("有两个管理员时可降级其中一个 200", demoteFirst.status === 200, `HTTP ${demoteFirst.status}`);

const demoteLastAdmin = await request(
  "PATCH",
  `${tenantBase}/members/${userId}`,
  { roleCodes: ["member"] },
  token,
);
check("唯一剩余管理员不可降级 409", demoteLastAdmin.status === 409, `HTTP ${demoteLastAdmin.status}`);

const restore = await request(
  "PATCH",
  `${tenantBase}/members/${adminMember?.userId}`,
  { roleCodes: ["admin"] },
  token,
);
check("恢复管理员 200", restore.status === 200, `HTTP ${restore.status}`);

const removeSecond = await request(
  "DELETE",
  `${tenantBase}/members/${userId}`,
  undefined,
  token,
);
check("移除第二成员 204", removeSecond.status === 204, `HTTP ${removeSecond.status}`);

// 只剩唯一管理员且无其他成员：允许移除，用于回收空租户
const removeSole = await request(
  "DELETE",
  `${tenantBase}/members/${adminMember?.userId}`,
  undefined,
  token,
);
check("唯一管理员+无其他成员可移除 204", removeSole.status === 204, `HTTP ${removeSole.status}`);

const deleteTenant = await request("DELETE", tenantBase, undefined, token);
check("空租户可删除 204", deleteTenant.status === 204, `HTTP ${deleteTenant.status}`);

if (createdUser.json?.id) {
  const cleanup = await request("DELETE", `/users/${createdUser.json.id}`, undefined, token);
  check("清理第二用户 204", cleanup.status === 204, `HTTP ${cleanup.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n租户引导与平台成员管理验收通过");
