/**
 * 本地演示账号 seed（仅开发环境使用）。
 *
 * 创建覆盖以下场景的账号：
 * - 平台超管 / 平台运维
 * - 租户管理员 / 普通成员
 * - 只有文件权限的自定义角色
 * - 同时属于两个租户的多租户用户
 * - 成员被停用 / 全局账号被禁用
 *
 * 运行：`pnpm --filter @starter/server db:seed:demo`
 * 密码统一由 `DEMO_USER_PASSWORD` 控制，默认 `demo_pwd_2026`。
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PasswordHasher } from "@nestjs/authentication";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_TENANT_ID } from "../../../packages/shared/src/index";
import { ensureTenantRoles } from "../src/tenants/provisioning/ensure-roles";

config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const PASSWORD = process.env.DEMO_USER_PASSWORD ?? "demo_pwd_2026";
const TENANT_B_ID = "00000000-0000-4000-8000-0000000000b2";
const TENANT_B_SLUG = "demo-b";
const FILE_MANAGER_ROLE = "file-manager";

type UserStatus = "active" | "disabled";
type MemberStatus = "active" | "suspended";

async function main() {
  const hasher = new PasswordHasher();
  const passwordHash = await hasher.hash(PASSWORD);

  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: { status: "active", deletedAt: null },
    create: { id: DEFAULT_TENANT_ID, slug: "default", name: "默认租户" },
  });
  await prisma.tenant.upsert({
    where: { id: TENANT_B_ID },
    update: {
      name: "演示租户 B",
      slug: TENANT_B_SLUG,
      status: "active",
      deletedAt: null,
    },
    create: {
      id: TENANT_B_ID,
      name: "演示租户 B",
      slug: TENANT_B_SLUG,
      status: "active",
    },
  });

  await seedTenantRoles(DEFAULT_TENANT_ID);
  await seedTenantRoles(TENANT_B_ID);
  await ensureFileManagerRole();

  const platform = await upsertUser(
    "demo.platform@example.com",
    "演示 · 平台超管",
    "active",
    passwordHash,
  );
  const ops = await upsertUser(
    "demo.ops@example.com",
    "演示 · 平台运维",
    "active",
    passwordHash,
  );
  const tenantAdmin = await upsertUser(
    "demo.tenantadmin@example.com",
    "演示 · 租户管理员",
    "active",
    passwordHash,
  );
  const member = await upsertUser(
    "demo.member@example.com",
    "演示 · 普通成员",
    "active",
    passwordHash,
  );
  const fileManager = await upsertUser(
    "demo.files@example.com",
    "演示 · 文件管理员",
    "active",
    passwordHash,
  );
  const multi = await upsertUser(
    "demo.multi@example.com",
    "演示 · 多租户用户",
    "active",
    passwordHash,
  );
  const suspended = await upsertUser(
    "demo.suspended@example.com",
    "演示 · 已停用成员",
    "active",
    passwordHash,
  );
  const disabled = await upsertUser(
    "demo.disabled@example.com",
    "演示 · 禁用账号",
    "disabled",
    passwordHash,
  );

  await upsertPlatformAdmin(platform.id, "super");
  await upsertPlatformAdmin(ops.id, "ops");

  await setMembership(DEFAULT_TENANT_ID, tenantAdmin.id, "active", ["admin"]);
  await setMembership(DEFAULT_TENANT_ID, member.id, "active", ["member"]);
  await setMembership(DEFAULT_TENANT_ID, fileManager.id, "active", [FILE_MANAGER_ROLE]);
  await setMembership(DEFAULT_TENANT_ID, multi.id, "active", ["member"]);
  await setMembership(DEFAULT_TENANT_ID, suspended.id, "suspended", ["member"]);
  await setMembership(TENANT_B_ID, multi.id, "active", ["admin"]);

  // 明确移除平台账号的租户成员关系，保证「平台管理员不是租户成员」的演示边界
  await removeMembership(DEFAULT_TENANT_ID, platform.id);
  await removeMembership(DEFAULT_TENANT_ID, ops.id);
  await removeMembership(DEFAULT_TENANT_ID, disabled.id);

  console.log(`演示账号已就绪，统一密码：${PASSWORD}`);
  console.table([
    { 场景: "平台超管", 邮箱: "demo.platform@example.com", 说明: "平台管理，不加入租户" },
    { 场景: "平台运维", 邮箱: "demo.ops@example.com", 说明: "平台只读，租户成员写操作受限" },
    { 场景: "租户管理员", 邮箱: "demo.tenantadmin@example.com", 说明: "默认租户 admin" },
    { 场景: "普通成员", 邮箱: "demo.member@example.com", 说明: "默认租户 member（只读）" },
    { 场景: "文件管理员", 邮箱: "demo.files@example.com", 说明: "默认租户自定义角色，仅文件读写" },
    { 场景: "多租户用户", 邮箱: "demo.multi@example.com", 说明: "默认租户 member + 演示租户 B admin" },
    { 场景: "已停用成员", 邮箱: "demo.suspended@example.com", 说明: "登录成功但没有可用租户" },
    { 场景: "禁用账号", 邮箱: "demo.disabled@example.com", 说明: "登录直接 401" },
  ]);
}

async function seedTenantRoles(tenantId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    await ensureTenantRoles(tx, tenantId);
  });
}

async function ensureFileManagerRole(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${DEFAULT_TENANT_ID}, true)`;
    const role = await tx.role.upsert({
      where: {
        tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: FILE_MANAGER_ROLE },
      },
      update: { name: "文件管理员", description: "只能查看、上传和删除文件" },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        code: FILE_MANAGER_ROLE,
        name: "文件管理员",
        description: "只能查看、上传和删除文件",
        isSystem: false,
      },
    });
    const permissions = await tx.permission.findMany({
      where: { code: { in: ["file:read", "file:write"] } },
      select: { id: true },
    });
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }
  });
}

async function upsertUser(
  email: string,
  displayName: string,
  status: UserStatus,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: { displayName, status, passwordHash },
    create: {
      authSubject: `demo:${email}`,
      email,
      displayName,
      status,
      passwordHash,
    },
    select: { id: true, email: true },
  });
}

async function upsertPlatformAdmin(
  userId: string,
  level: "super" | "ops",
): Promise<void> {
  await prisma.platformAdmin.upsert({
    where: { userId },
    update: { level },
    create: { userId, level },
  });
}

async function setMembership(
  tenantId: string,
  userId: string,
  status: MemberStatus,
  roleCodes: string[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    await tx.userTenant.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: { status },
      create: { userId, tenantId, status },
    });

    const tenantRoles = await tx.role.findMany({
      where: { tenantId },
      select: { id: true, code: true },
    });
    const roleIds = tenantRoles
      .filter((role) => roleCodes.includes(role.code))
      .map((role) => role.id);
    if (roleIds.length !== roleCodes.length) {
      throw new Error(
        `租户 ${tenantId} 缺少角色：${roleCodes.join(", ")}`,
      );
    }

    await tx.userRole.deleteMany({
      where: {
        userId,
        roleId: { in: tenantRoles.map((role) => role.id) },
      },
    });
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }
  });
}

async function removeMembership(
  tenantId: string,
  userId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    const tenantRoles = await tx.role.findMany({
      where: { tenantId },
      select: { id: true },
    });
    await tx.userRole.deleteMany({
      where: {
        userId,
        roleId: { in: tenantRoles.map((role) => role.id) },
      },
    });
    await tx.userTenant.deleteMany({ where: { userId, tenantId } });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
