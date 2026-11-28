/**
 * 文件上传 / 下载 / 删除与权限验收。
 * 前置：server 启动、数据库已 seed（含 file:read / file:write）。
 * 运行：`pnpm --filter @starter/server test:files`
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
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // 二进制或空响应
  }
  return { status: res.status, json, text, headers: res.headers };
}

const admin = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
const adminToken = admin.json?.accessToken;
check("管理员登录", admin.status === 201 && Boolean(adminToken), `HTTP ${admin.status}`);

const tenants = await request("GET", "/me/tenants", undefined, adminToken);
const tenantId = tenants.json?.[0]?.id;
check("取得默认租户", Boolean(tenantId), tenantId ?? "");

const unauthorized = await request("GET", `/t/${tenantId}/files`);
check("未登录列表 401", unauthorized.status === 401, `HTTP ${unauthorized.status}`);

const suffix = Date.now();
const content = `file upload e2e ${suffix}`;
const form = new FormData();
form.append("file", new Blob([content], { type: "text/plain" }), `验收-${suffix}.txt`);
const uploaded = await request("POST", `/t/${tenantId}/files`, form, adminToken);
check("上传文件 201", uploaded.status === 201, `HTTP ${uploaded.status}`);
const fileId = uploaded.json?.id;
check("文件名正确", uploaded.json?.name === `验收-${suffix}.txt`, uploaded.json?.name ?? "");
check("大小正确", uploaded.json?.size === content.length, String(uploaded.json?.size));
check("上传者已填充", Boolean(uploaded.json?.uploadedByName), uploaded.json?.uploadedByName ?? "");
check("checksum 为 64 位", uploaded.json?.checksum?.length === 64, uploaded.json?.checksum ?? "");

const badType = new FormData();
badType.append("file", new Blob(["<script>alert(1)</script>"], { type: "text/html" }), "x.html");
const rejected = await request("POST", `/t/${tenantId}/files`, badType, adminToken);
check("拒绝 HTML 上传 400", rejected.status === 400, `HTTP ${rejected.status}`);

const empty = new FormData();
empty.append("file", new Blob([], { type: "text/plain" }), "empty.txt");
const emptyRes = await request("POST", `/t/${tenantId}/files`, empty, adminToken);
check("拒绝空文件 400", emptyRes.status === 400, `HTTP ${emptyRes.status}`);

const listed = await request(
  "GET",
  `/t/${tenantId}/files?keyword=${encodeURIComponent(`验收-${suffix}`)}`,
  undefined,
  adminToken,
);
check("搜索到文件 200", listed.status === 200, `HTTP ${listed.status}`);
check("列表总数 1", listed.json?.total === 1, `total=${listed.json?.total}`);
check("列表项 id 匹配", listed.json?.items?.[0]?.id === fileId, listed.json?.items?.[0]?.id ?? "");

const docs = await request(
  "GET",
  `/t/${tenantId}/files?category=document&keyword=${encodeURIComponent(`验收-${suffix}`)}`,
  undefined,
  adminToken,
);
check("文档分类可命中", docs.json?.total === 1, `total=${docs.json?.total}`);

const images = await request(
  "GET",
  `/t/${tenantId}/files?category=image&keyword=${encodeURIComponent(`验收-${suffix}`)}`,
  undefined,
  adminToken,
);
check("图片分类为空", images.json?.total === 0, `total=${images.json?.total}`);

const downloaded = await request(
  "GET",
  `/t/${tenantId}/files/${fileId}/content`,
  undefined,
  adminToken,
);
check("下载文件 200", downloaded.status === 200, `HTTP ${downloaded.status}`);
check("下载内容一致", downloaded.text === content, downloaded.text.slice(0, 40));
check(
  "强制 attachment",
  downloaded.headers.get("content-disposition")?.startsWith("attachment;") ?? false,
  downloaded.headers.get("content-disposition") ?? "",
);
check(
  "nosniff",
  downloaded.headers.get("x-content-type-options") === "nosniff",
  downloaded.headers.get("x-content-type-options") ?? "",
);

// 只读成员：能看列表，不能上传/删除
const memberEmail = `file-member-${suffix}@example.com`;
const memberPassword = "file_member_2026";
const member = await request(
  "POST",
  "/users",
  { email: memberEmail, displayName: "文件只读成员", password: memberPassword },
  adminToken,
);
check("准备只读成员 201", member.status === 201, `HTTP ${member.status}`);
const memberId = member.json?.id;

const added = await request(
  "POST",
  `/tenants/${tenantId}/members`,
  { email: memberEmail, roleCodes: ["member"] },
  adminToken,
);
check("加入默认租户 201", added.status === 201, `HTTP ${added.status}`);

const memberLogin = await request("POST", "/auth/sign-in", {
  email: memberEmail,
  password: memberPassword,
});
const memberToken = memberLogin.json?.accessToken;
check("成员登录", memberLogin.status === 201 && Boolean(memberToken), `HTTP ${memberLogin.status}`);

const memberList = await request("GET", `/t/${tenantId}/files`, undefined, memberToken);
check("成员可看列表 200", memberList.status === 200, `HTTP ${memberList.status}`);

const memberUpload = new FormData();
memberUpload.append("file", new Blob(["x"], { type: "text/plain" }), "member.txt");
const memberUploadRes = await request(
  "POST",
  `/t/${tenantId}/files`,
  memberUpload,
  memberToken,
);
check("成员上传 403", memberUploadRes.status === 403, `HTTP ${memberUploadRes.status}`);

const memberDelete = await request(
  "DELETE",
  `/t/${tenantId}/files/${fileId}`,
  undefined,
  memberToken,
);
check("成员删除 403", memberDelete.status === 403, `HTTP ${memberDelete.status}`);

const removed = await request(
  "DELETE",
  `/t/${tenantId}/files/${fileId}`,
  undefined,
  adminToken,
);
check("管理员删除 204", removed.status === 204, `HTTP ${removed.status}`);

const afterDelete = await request(
  "GET",
  `/t/${tenantId}/files/${fileId}/content`,
  undefined,
  adminToken,
);
check("删除后内容 404", afterDelete.status === 404, `HTTP ${afterDelete.status}`);

const missing = await request(
  "DELETE",
  `/t/${tenantId}/files/00000000-0000-4000-8000-000000000000`,
  undefined,
  adminToken,
);
check("删除不存在文件 404", missing.status === 404, `HTTP ${missing.status}`);

if (memberId) {
  const cleanup = await request("DELETE", `/users/${memberId}`, undefined, adminToken);
  check("清理只读成员 204", cleanup.status === 204, `HTTP ${cleanup.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n文件上传验收通过");
