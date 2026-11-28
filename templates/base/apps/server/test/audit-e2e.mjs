/**
 * 审计日志验收：登录事件 + 租户 CRUD + 查询接口。
 * 前置：server 已启动、数据库已 migrate + seed。
 * 运行：`pnpm --filter @starter/server test:audit`
 *
 * 注意：audit_logs 是 append-only，测试数据不会清理（用唯一 slug 区分）。
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

const BASE = process.env.API_BASE ?? "http://localhost:47100/api";
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
  return { status: res.status, json, text };
}

const anon = await request("GET", "/audit-logs");
check("未登录访问审计接口 401", anon.status === 401, `HTTP ${anon.status}`);

const failedSignIn = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: "definitely_wrong",
});
check("错误密码 401", failedSignIn.status === 401, `HTTP ${failedSignIn.status}`);

const sign = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("登录成功", sign.status === 201 || sign.status === 200, `HTTP ${sign.status}`);
const token = sign.json?.accessToken;
check("拿到 accessToken", Boolean(token));

const slug = `audit-e2e-${Date.now()}`;
const created = await request("POST", "/tenants", { name: "审计验收租户", slug }, token);
check("创建租户 201", created.status === 201, `HTTP ${created.status}`);
const tenantId = created.json?.id;

if (tenantId) {
  const updated = await request("PATCH", `/tenants/${tenantId}`, { name: "审计验收租户（改名）" }, token);
  check("更新租户 200", updated.status === 200, `HTTP ${updated.status}`);
}

const list = await request("GET", "/audit-logs?pageSize=50", undefined, token);
check("审计列表 200", list.status === 200, `HTTP ${list.status}`);
const items = list.json?.items ?? [];
check("审计列表非空", items.length > 0, `total=${list.json?.total}`);

const signInSuccess = items.find((item) => item.action === "auth.sign_in" && item.result === "success");
check("记录登录成功", Boolean(signInSuccess), signInSuccess?.actorLabel ?? "");
check("登录审计有 traceId", Boolean(signInSuccess?.traceId));
check("登录审计有 ip", Boolean(signInSuccess?.ip));

const signInFailure = items.find((item) => item.action === "auth.sign_in" && item.result === "failure");
check("记录登录失败", Boolean(signInFailure), signInFailure?.actorLabel ?? "");
check("失败审计有原因", Boolean(signInFailure?.summary), signInFailure?.summary ?? "");

const createAudit = items.find(
  (item) => item.action === "tenant.create" && item.resourceId === tenantId,
);
check("记录 tenant.create", Boolean(createAudit));
check("tenant.create 有 after", Boolean(createAudit?.after?.slug), createAudit?.after?.slug ?? "");
check("after 不含密码", !JSON.stringify(createAudit?.after ?? {}).includes(PASSWORD));

const updateAudit = items.find(
  (item) => item.action === "tenant.update" && item.resourceId === tenantId,
);
check("记录 tenant.update", Boolean(updateAudit));
check("tenant.update 有 before", Boolean(updateAudit?.before?.name), updateAudit?.before?.name ?? "");
check(
  "before / after 名称不同",
  updateAudit?.before?.name !== updateAudit?.after?.name,
  `before=${updateAudit?.before?.name} after=${updateAudit?.after?.name}`,
);

const filtered = await request(
  "GET",
  `/audit-logs?action=tenant.create&pageSize=5`,
  undefined,
  token,
);
check("按 action 过滤 200", filtered.status === 200, `HTTP ${filtered.status}`);
check(
  "按 action 过滤结果一致",
  (filtered.json?.items ?? []).every((item) => item.action === "tenant.create"),
);

const failureOnly = await request(
  "GET",
  "/audit-logs?result=failure&pageSize=5",
  undefined,
  token,
);
check("按 result=failure 过滤 200", failureOnly.status === 200, `HTTP ${failureOnly.status}`);
check(
  "failure 过滤结果一致",
  (failureOnly.json?.items ?? []).every((item) => item.result === "failure"),
);

const keyword = await request(
  "GET",
  `/audit-logs?keyword=${encodeURIComponent(slug)}&pageSize=5`,
  undefined,
  token,
);
check("关键词搜索 200", keyword.status === 200, `HTTP ${keyword.status}`);
check(
  "关键词命中新建租户",
  (keyword.json?.items ?? []).some((item) => item.resourceId === tenantId || item.after?.slug === slug),
);

if (createAudit) {
  const detail = await request("GET", `/audit-logs/${createAudit.id}`, undefined, token);
  check("审计详情 200", detail.status === 200, `HTTP ${detail.status}`);
  check("详情含 after", Boolean(detail.json?.after));
}

const badId = await request("GET", "/audit-logs/not-a-uuid", undefined, token);
check("非法 id 400", badId.status === 400, `HTTP ${badId.status}`);

const missing = await request(
  "GET",
  "/audit-logs/00000000-0000-4000-8000-000000000000",
  undefined,
  token,
);
check("不存在的审计 404", missing.status === 404, `HTTP ${missing.status}`);

if (tenantId) {
  const removed = await request("DELETE", `/tenants/${tenantId}`, undefined, token);
  check("删除租户 204", removed.status === 204, `HTTP ${removed.status}`);

  const afterDelete = await request(
    "GET",
    `/audit-logs?action=tenant.delete&pageSize=20`,
    undefined,
    token,
  );
  check(
    "记录 tenant.delete",
    (afterDelete.json?.items ?? []).some((item) => item.resourceId === tenantId),
  );
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n审计日志验收通过");
