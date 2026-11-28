import { PasswordHasher } from "@nestjs/authentication";
import type { PrismaClient } from "../generated/prisma/client";
import { DEFAULT_TENANT_ID } from "../shared";
import { ensureTenantRoles } from "../tenants/provisioning/ensure-roles";

export const DEMO_TENANT_B_ID = "00000000-0000-4000-8000-0000000000b2";
export const DEMO_TENANT_B_SLUG = "demo-b";
export const DEMO_FILE_MANAGER_ROLE = "file-manager";
export const DEFAULT_DEMO_PASSWORD = "demo_pwd_2026";

export type DemoSeedAccount = {
  scenario: string;
  email: string;
  note: string;
};

export type DemoSeedResult = {
  password: string;
  accounts: DemoSeedAccount[];
};

const ACCOUNTS: DemoSeedAccount[] = [
  {
    scenario: "平台超管",
    email: "demo.platform@example.com",
    note: "平台管理，不加入租户",
  },
  {
    scenario: "平台运维",
    email: "demo.ops@example.com",
    note: "平台只读；租户、用户、权限点写操作受限",
  },
  {
    scenario: "租户管理员",
    email: "demo.tenantadmin@example.com",
    note: "演示租户 A admin",
  },
  {
    scenario: "普通成员",
    email: "demo.member@example.com",
    note: "演示租户 A member（只读）",
  },
  {
    scenario: "文件管理员",
    email: "demo.files@example.com",
    note: "演示租户 A 自定义角色，仅文件读写",
  },
  {
    scenario: "多租户用户",
    email: "demo.multi@example.com",
    note: "演示租户 A member + 演示租户 B admin",
  },
  {
    scenario: "已停用成员",
    email: "demo.suspended@example.com",
    note: "演示租户 A 成员已停用",
  },
  {
    scenario: "禁用账号",
    email: "demo.disabled@example.com",
    note: "登录直接 401",
  },
];

/**
 * 创建/重置本地演示账号。CLI seed 与开发面板共用，保证两处行为一致。
 * 幂等：重复执行会重置演示账号密码与成员关系，不影响其他用户。
 */
export async function seedDemoAccounts(
  prisma: PrismaClient,
  password = DEFAULT_DEMO_PASSWORD,
): Promise<DemoSeedResult> {
  const hasher = new PasswordHasher();
  const passwordHash = await hasher.hash(password);

  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: { name: "演示租户 A", status: "active", deletedAt: null },
    create: { id: DEFAULT_TENANT_ID, slug: "default", name: "演示租户 A" },
  });
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_B_ID },
    update: {
      name: "演示租户 B",
      slug: DEMO_TENANT_B_SLUG,
      status: "active",
      deletedAt: null,
    },
    create: {
      id: DEMO_TENANT_B_ID,
      name: "演示租户 B",
      slug: DEMO_TENANT_B_SLUG,
      status: "active",
    },
  });

  await seedTenantRoles(prisma, DEFAULT_TENANT_ID);
  await seedTenantRoles(prisma, DEMO_TENANT_B_ID);
  await ensureFileManagerRole(prisma);

  const platform = await upsertUser(
    prisma,
    "demo.platform@example.com",
    "演示 · 平台超管",
    "active",
    passwordHash,
  );
  const ops = await upsertUser(
    prisma,
    "demo.ops@example.com",
    "演示 · 平台运维",
    "active",
    passwordHash,
  );
  const tenantAdmin = await upsertUser(
    prisma,
    "demo.tenantadmin@example.com",
    "演示 · 租户管理员",
    "active",
    passwordHash,
  );
  const member = await upsertUser(
    prisma,
    "demo.member@example.com",
    "演示 · 普通成员",
    "active",
    passwordHash,
  );
  const fileManager = await upsertUser(
    prisma,
    "demo.files@example.com",
    "演示 · 文件管理员",
    "active",
    passwordHash,
  );
  const multi = await upsertUser(
    prisma,
    "demo.multi@example.com",
    "演示 · 多租户用户",
    "active",
    passwordHash,
  );
  const suspended = await upsertUser(
    prisma,
    "demo.suspended@example.com",
    "演示 · 已停用成员",
    "active",
    passwordHash,
  );
  const disabled = await upsertUser(
    prisma,
    "demo.disabled@example.com",
    "演示 · 禁用账号",
    "disabled",
    passwordHash,
  );

  await upsertPlatformAdmin(prisma, platform.id, "super");
  await upsertPlatformAdmin(prisma, ops.id, "ops");

  await setMembership(prisma, DEFAULT_TENANT_ID, tenantAdmin.id, "active", [
    "admin",
  ]);
  await setMembership(prisma, DEFAULT_TENANT_ID, member.id, "active", [
    "member",
  ]);
  await setMembership(prisma, DEFAULT_TENANT_ID, fileManager.id, "active", [
    DEMO_FILE_MANAGER_ROLE,
  ]);
  await setMembership(prisma, DEFAULT_TENANT_ID, multi.id, "active", [
    "member",
  ]);
  await setMembership(prisma, DEFAULT_TENANT_ID, suspended.id, "suspended", [
    "member",
  ]);
  await setMembership(prisma, DEMO_TENANT_B_ID, multi.id, "active", ["admin"]);

  // 平台管理员保持「不属于租户」的边界
  await removeMembership(prisma, DEFAULT_TENANT_ID, platform.id);
  await removeMembership(prisma, DEFAULT_TENANT_ID, ops.id);
  await removeMembership(prisma, DEFAULT_TENANT_ID, disabled.id);

  return { password, accounts: ACCOUNTS };
}

async function seedTenantRoles(
  prisma: PrismaClient,
  tenantId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    await ensureTenantRoles(tx, tenantId);
  });
}

async function ensureFileManagerRole(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${DEFAULT_TENANT_ID}, true)`;
    const role = await tx.role.upsert({
      where: {
        tenantId_code: {
          tenantId: DEFAULT_TENANT_ID,
          code: DEMO_FILE_MANAGER_ROLE,
        },
      },
      update: { name: "文件管理员", description: "只能查看、上传和删除文件" },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        code: DEMO_FILE_MANAGER_ROLE,
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
  prisma: PrismaClient,
  email: string,
  displayName: string,
  status: "active" | "disabled",
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
  prisma: PrismaClient,
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
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  status: "active" | "suspended",
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
      throw new Error(`租户 ${tenantId} 缺少角色：${roleCodes.join(", ")}`);
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
  prisma: PrismaClient,
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
