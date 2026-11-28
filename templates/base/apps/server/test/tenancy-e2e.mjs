/**
 * 租户边界 + 登录闭环的接口验收（AC5 / E1~E3）。
 * 前置：`pnpm --filter @starter/server start` 且数据库已 migrate + seed。
 * 运行：`pnpm --filter @starter/server test:e2e`
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 与 main.ts 一致：从 test/ 向上找最近的 .env，避免 seed 用自定义密码而 e2e 仍发默认值
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
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

async function request(method, path, body, token) {
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
    /* 非 JSON 响应保留原文 */
  }
  return { status: res.status, json, text, headers: res.headers };
}

const health = await request("GET", "/health");
check("AC5 health 公开可访问", health.status === 200, `HTTP ${health.status}`);

const traceId = health.headers.get("x-trace-id");
const traceparent = health.headers.get("traceparent");
check(
  "traceId 响应头（成功响应）",
  Boolean(traceId && /^[0-9a-f]{32}$/.test(traceId)),
  traceId ?? "missing",
);
check(
  "traceparent 格式正确",
  Boolean(traceparent && traceparent.startsWith(`00-${traceId}-`)),
  traceparent ?? "missing",
);

const wrong = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: "definitely_wrong",
});
check("E1 错误密码 401", wrong.status === 401, `HTTP ${wrong.status}`);
check(
  "错误响应体 traceId 与响应头一致",
  Boolean(wrong.json?.traceId && wrong.json.traceId === wrong.headers.get("x-trace-id")),
  `body=${wrong.json?.traceId ?? "missing"}`,
);

const unknown = await request("POST", "/auth/sign-in", {
  email: "nobody@example.com",
  password: PASSWORD,
});
check(
  "E1 未知邮箱与错误密码同响应（防枚举）",
  unknown.status === 401 &&
    wrong.status === 401 &&
    unknown.json?.message === wrong.json?.message &&
    unknown.json?.errorCode === wrong.json?.errorCode,
  `HTTP ${unknown.status}`,
);

const badDto = await request("POST", "/auth/sign-in", {
  email: "not-an-email",
  password: "",
});
check("DTO 非法邮箱/空密码 400", badDto.status === 400, `HTTP ${badDto.status}`);

const signed = await request("POST", "/auth/sign-in", {
  email: EMAIL,
  password: PASSWORD,
});
check("E1 正确密码签发 token", signed.status === 201, `HTTP ${signed.status}`);
check("登录响应不含密码字段", !/password/i.test(signed.text));
const token = signed.json?.accessToken;
check("E1 token 非空", typeof token === "string" && token.length > 0);

if (token) {
  const me = await request("GET", "/me/tenants", null, token);
  check("E2 登录用户可读自己的租户列表", me.status === 200, `HTTP ${me.status}`);
  const tenantId = me.json?.[0]?.id;
  check("E2 租户列表非空", typeof tenantId === "string");

  if (tenantId) {
    const membership = await request(
      "GET",
      `/t/${tenantId}/membership`,
      null,
      token,
    );
    check(
      "E3 成员可读自己在该租户的成员信息",
      membership.status === 200 &&
        membership.json?.tenantId === tenantId &&
        membership.json?.role === "admin",
      `HTTP ${membership.status}`,
    );

    // S1 应用层接线：租户表必须走 prisma.tenant（事务内 RLS），seed 默认租户有 2 个角色
    const roles = await request("GET", `/t/${tenantId}/roles`, null, token);
    check(
      "RLS 应用层：租户表只返回当前租户数据",
      roles.status === 200 && Array.isArray(roles.json) && roles.json.length === 2,
      `HTTP ${roles.status}, rows=${roles.json?.length}`,
    );
  }

  const noToken = await request("GET", "/me/tenants");
  check("AC5 无 token 访问业务路由 401", noToken.status === 401, `HTTP ${noToken.status}`);
}

console.log(failed ? `\n${failed} 项失败` : "\n全部通过");
process.exit(failed ? 1 : 0);
