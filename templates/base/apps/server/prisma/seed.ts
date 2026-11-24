import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";

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

// 默认租户 slug。单租户阶段所有用户归到这个租户。
const DEFAULT_TENANT_SLUG = "default";

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

async function main() {
  // 默认租户
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: {},
    create: { slug: DEFAULT_TENANT_SLUG, name: "默认租户" },
  });

  // 权限点
  const permissionIds = new Map<string, string>();
  for (const p of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name },
      create: { code: p.code, name: p.name },
    });
    permissionIds.set(p.code, record.id);
  }

  // 角色 + 角色权限
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
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
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  // 套餐
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description },
      create: { code: p.code, name: p.name, description: p.description },
    });
  }

  console.log("seed 完成：默认租户、内置角色、权限点、套餐已就绪");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
