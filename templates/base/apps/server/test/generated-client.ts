/**
 * 验证「后端 Swagger → heyapi 生成客户端」联动（AC4）。
 * 前置：pnpm api:generate 已生成，后端已启动。
 * 运行：pnpm --filter @starter/server test:generated
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  authControllerSignIn,
  client,
  meControllerTenants,
  tenantControllerMembership,
} from "@starter/api/generated";

// server 是 CommonJS：用 __dirname 向上找 .env
let dir = __dirname;
for (let i = 0; i < 5; i++) {
  const candidate = resolve(dir, ".env");
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
  dir = resolve(dir, "..");
}

const BASE = process.env.API_BASE ?? "http://localhost:47100";
const EMAIL = process.env.SEED_USER_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.SEED_USER_PASSWORD ?? "seed_pwd_2026";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const main = async () => {
  client.setConfig({ baseUrl: BASE });

  const signed = await authControllerSignIn({
    body: { email: EMAIL, password: PASSWORD },
  });
  const token = signed.data?.accessToken;
  check(
    "生成客户端 sign-in 返回 token",
    typeof token === "string" && token.length > 0,
  );

  if (!token) return;

  const auth = { Authorization: `Bearer ${token}` };
  const me = await meControllerTenants({ headers: auth });
  check(
    "生成客户端 me/tenants 返回租户列表",
    Array.isArray(me.data) && me.data.length > 0,
    `rows=${(me.data as unknown[] | undefined)?.length}`,
  );

  const tenantId = me.data?.[0]?.id;
  if (!tenantId) return;

  const membership = await tenantControllerMembership({
    path: { tenantId },
    headers: auth,
  });
  check(
    "生成客户端 membership 返回当前租户",
    membership.data?.tenantId === tenantId,
    `tenantId=${membership.data?.tenantId}`,
  );
};

main()
  .catch((err) => {
    console.error(err);
    failed++;
  })
  .finally(() => {
    console.log(failed ? `\n${failed} 项失败` : "\n生成客户端联动通过");
    // 不要 process.exit：fetch keep-alive 连接未清理时 Windows 会触发 libuv 断言
    process.exitCode = failed ? 1 : 0;
  });
