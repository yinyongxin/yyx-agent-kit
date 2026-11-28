/**
 * 租户 CRUD 验收（平台管理员）。
 * 前置：pnpm api:generate 不必要；后端已启动、seed 已执行。
 * 运行：pnpm --filter @starter/server test:tenants
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
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const request = async (method, path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* 保留原文 */
  }
  return { status: res.status, json, text };
};

const signed = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
const token = signed.json?.accessToken;
check("登录获取 token", typeof token === "string" && token.length > 0);

const slug = `e2e-tenant-${Date.now()}`;
let createdId;

if (token) {
  try {
    const created = await request(
      "POST",
      "/tenants",
      { name: "E2E Tenant", slug },
      token,
    );
    createdId = created.json?.id;
    check(
      "创建租户 201",
      created.status === 201 && created.json?.slug === slug,
      `HTTP ${created.status}`,
    );

    const list = await request(
      "GET",
      `/tenants?keyword=${encodeURIComponent(slug)}`,
      null,
      token,
    );
    check(
      "列表包含新租户",
      list.status === 200 && list.json?.items?.some((t) => t.id === createdId),
      `HTTP ${list.status}`,
    );

    const detail = await request("GET", `/tenants/${createdId}`, null, token);
    check(
      "详情返回该租户",
      detail.status === 200 && detail.json?.id === createdId,
      `HTTP ${detail.status}`,
    );

    const updated = await request(
      "PATCH",
      `/tenants/${createdId}`,
      { status: "suspended" },
      token,
    );
    check(
      "更新状态为 suspended",
      updated.status === 200 && updated.json?.status === "suspended",
      `HTTP ${updated.status}`,
    );

    const dup = await request(
      "POST",
      "/tenants",
      { name: "Dup", slug },
      token,
    );
    check("slug 重复返回 409", dup.status === 409, `HTTP ${dup.status}`);

    const missing = await request(
      "GET",
      "/tenants/00000000-0000-4000-8000-000000000099",
      null,
      token,
    );
    check("不存在的租户 404", missing.status === 404, `HTTP ${missing.status}`);

    const removeDefault = await request(
      "DELETE",
      `/tenants/${DEFAULT_TENANT_ID}`,
      null,
      token,
    );
    check(
      "有成员的租户删除返回 409",
      removeDefault.status === 409,
      `HTTP ${removeDefault.status}`,
    );

    const removed = await request(
      "DELETE",
      `/tenants/${createdId}`,
      null,
      token,
    );
    check("删除空租户 204", removed.status === 204, `HTTP ${removed.status}`);

    const afterDelete = await request("GET", `/tenants/${createdId}`, null, token);
    check("软删除后详情 404", afterDelete.status === 404, `HTTP ${afterDelete.status}`);

    const reused = await request(
      "POST",
      "/tenants",
      { name: "Reused Tenant", slug },
      token,
    );
    check("软删除后 slug 可复用", reused.status === 201, `HTTP ${reused.status}`);
    if (reused.json?.id) {
      const removedReused = await request(
        "DELETE",
        `/tenants/${reused.json.id}`,
        null,
        token,
      );
      check(
        "复用租户可再次删除 204",
        removedReused.status === 204,
        `HTTP ${removedReused.status}`,
      );
    }

    createdId = undefined;
  } finally {
    if (createdId) {
      await request("DELETE", `/tenants/${createdId}`, null, token);
    }
  }

  // 暂停租户后，已有 token 也不能再访问 /t/:tenantId/*
  const suspendSlug = `e2e-suspend-${Date.now()}`;
  let suspendId;
  try {
    const made = await request(
      "POST",
      "/tenants",
      { name: "Suspend Tenant", slug: suspendSlug, initialAdminEmail: EMAIL },
      token,
    );
    suspendId = made.json?.id;
    check("准备暂停测试租户 201", made.status === 201, `HTTP ${made.status}`);

    if (suspendId) {
      const active = await request(
        "GET",
        `/t/${suspendId}/members`,
        null,
        token,
      );
      check("暂停前成员接口 200", active.status === 200, `HTTP ${active.status}`);

      const suspended = await request(
        "PATCH",
        `/tenants/${suspendId}`,
        { status: "suspended" },
        token,
      );
      check(
        "暂停租户 200",
        suspended.status === 200 && suspended.json?.status === "suspended",
        `HTTP ${suspended.status}`,
      );

      const blocked = await request(
        "GET",
        `/t/${suspendId}/members`,
        null,
        token,
      );
      check("暂停后成员接口 404", blocked.status === 404, `HTTP ${blocked.status}`);

      const resumed = await request(
        "PATCH",
        `/tenants/${suspendId}`,
        { status: "active" },
        token,
      );
      check("恢复租户 200", resumed.status === 200, `HTTP ${resumed.status}`);

      const reopened = await request(
        "GET",
        `/t/${suspendId}/members`,
        null,
        token,
      );
      check("恢复后成员接口 200", reopened.status === 200, `HTTP ${reopened.status}`);

      const me = await request("GET", "/me", null, token);
      if (me.json?.id) {
        await request(
          "DELETE",
          `/tenants/${suspendId}/members/${me.json.id}`,
          null,
          token,
        );
      }
    }
  } finally {
    if (suspendId) {
      await request("DELETE", `/tenants/${suspendId}`, null, token);
    }
  }
}

console.log(failed ? `\n${failed} 项失败` : "\n租户 CRUD 验收通过");
process.exitCode = failed ? 1 : 0;
