import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PasswordHasher } from "@nestjs/authentication";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_TENANT_ID } from "../../../packages/shared/src/index";

/**
 * seed 只负责初始业务数据（默认租户/角色/权限点/套餐），不负责表结构，也不负责已有数据演进。
 * 结构变更走 prisma migrate；已有数据变更（如权限点 code 调整）走显式数据迁移。
 * upsert 的 update 只覆盖展示字段，不覆盖 code / isSystem 等标识或控制字段。
 */

// 从项目根加载 .env（本文件在 apps/server/prisma/，根在上三级），保证从任意子目录运行都能连库
config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});


// 默认租户 slug。单租户部署只建这一个租户；多对多关系下用户通过 UserTenant 关联进来。
const DEFAULT_TENANT_SLUG = "default";

// 示例用户：seed 后可用它构造 token 验证租户边界 guard；生产部署可删。
const SEED_USER = {
  authSubject: "seed-admin",
  email: "admin@example.com",
  displayName: "示例管理员",
} as const;

// 内置角色 + 权限。admin 拥有全部权限，member 拥有只读权限。
const PERMISSIONS = [
  { code: "tenant:read", name: "查看租户" },
  { code: "tenant:write", name: "管理租户" },
  { code: "user:read", name: "查看用户" },
  { code: "user:write", name: "管理用户" },
  { code: "role:read", name: "查看角色" },
  { code: "role:write", name: "管理角色" },
  { code: "knowledge:read", name: "查看知识库" },
  { code: "knowledge:write", name: "管理知识库" },
  { code: "replay:read", name: "查看动线回放" },
  { code: "replay:write", name: "管理动线回放" },
  { code: "billing:manage", name: "管理套餐订阅" },
] as const;

const ROLES = [
  { code: "admin", name: "管理员", description: "拥有全部权限", all: true },
  {
    code: "member",
    name: "普通成员",
    description: "只读权限",
    all: false,
  },
] as const;

const PLANS = [
  { code: "free", name: "免费版", description: "基础功能" },
  { code: "pro", name: "专业版", description: "全部功能" },
] as const;

/**
 * `prisma migrate reset` 会 DROP/CREATE public schema，运行时账号的 USAGE 会丢失；
 * 之后 seed / 应用都会 permission denied for schema public。用迁移账号补授权（幂等）。
 */
async function ensureRuntimeSchemaUsage() {
  const adminUrl = process.env.MIGRATE_DATABASE_URL;
  if (!adminUrl) return;

  const role = new URL(process.env.DATABASE_URL!).username;
  const quoted = `"${role.replace(/"/g, '""')}"`;
  const admin = new PrismaClient({
    adapter: new PrismaPg({ connectionString: adminUrl }),
  });
  try {
    // migrate reset 会重建 schema，init-db.sql 不会再跑；这里把运行时账号的权限补齐
    await admin.$executeRawUnsafe(
      `GRANT USAGE ON SCHEMA public TO ${quoted}`,
    );
    await admin.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoted}`,
    );
    await admin.$executeRawUnsafe(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${quoted}`,
    );
    await admin.$executeRawUnsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoted}`,
    );
    await admin.$executeRawUnsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${quoted}`,
    );
  } finally {
    await admin.$disconnect();
  }
}

async function main() {
  await ensureRuntimeSchemaUsage();
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${DEFAULT_TENANT_ID}, true)`;
      // 默认租户
      const tenant = await tx.tenant.upsert({
        where: { id: DEFAULT_TENANT_ID },
        update: { deletedAt: null },
        create: { id: DEFAULT_TENANT_ID, slug: DEFAULT_TENANT_SLUG, name: "默认租户" },
      });

      // 权限点
      const permissionIds = new Map<string, string>();
      for (const p of PERMISSIONS) {
        const record = await tx.permission.upsert({
          where: { code: p.code },
          update: { name: p.name },
          create: { code: p.code, name: p.name },
        });
        permissionIds.set(p.code, record.id);
      }

      // 角色 + 角色权限
      let adminRoleId: string | undefined;
      for (const r of ROLES) {
        const role = await tx.role.upsert({
          where: { tenantId_code: { tenantId: tenant.id, code: r.code } },
          update: { name: r.name, description: r.description },
          create: {
            tenantId: tenant.id,
            code: r.code,
            name: r.name,
            description: r.description,
            isSystem: true,
          },
        });

        const codes = r.all
          ? PERMISSIONS.map((p) => p.code)
          : PERMISSIONS.filter((p) => p.code.endsWith(":read")).map((p) => p.code);

        for (const code of codes) {
          const permissionId = permissionIds.get(code);
          if (!permissionId) continue;
          await tx.rolePermission.upsert({
            where: {
              roleId_permissionId: { roleId: role.id, permissionId },
            },
            update: {},
            create: { roleId: role.id, permissionId },
          });
        }

        if (r.code === "admin") adminRoleId = role.id;
      }

      // 示例用户（全局身份）+ 默认租户成员关系 + admin 角色 + 平台管理员
      // 密码可用 SEED_USER_PASSWORD 覆盖；开发环境默认值记入 docs/guides/credentials.md。
      // 已有用户不覆盖凭据（seed 幂等 ≠ 回滚密码），也不重复跑昂贵的 scrypt。
      const existing = await tx.user.findUnique({
        where: { email: SEED_USER.email },
        select: { passwordHash: true },
      });
      const passwordHash =
        existing?.passwordHash ??
        (await new PasswordHasher().hash(
          process.env.SEED_USER_PASSWORD ?? "seed_pwd_2026",
        ));
      const user = await tx.user.upsert({
        where: { email: SEED_USER.email },
        update: { displayName: SEED_USER.displayName },
        create: { ...SEED_USER, passwordHash },
      });

      await tx.userTenant.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
        update: { status: "active" },
        create: { userId: user.id, tenantId: tenant.id, status: "active" },
      });

      if (adminRoleId) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: adminRoleId } },
          update: {},
          create: { userId: user.id, roleId: adminRoleId },
        });
      }

      await tx.platformAdmin.upsert({
        where: { userId: user.id },
        update: { level: "super" },
        create: { userId: user.id, level: "super" },
      });

      // 套餐
      for (const p of PLANS) {
        await tx.plan.upsert({
          where: { code: p.code },
          update: { name: p.name, description: p.description },
          create: { code: p.code, name: p.name, description: p.description },
        });
      }

    },
    { maxWait: 5_000, timeout: 30_000 },
  );
  console.log("seed 完成：默认租户、内置角色、权限点、套餐、示例用户与平台管理员已就绪");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
