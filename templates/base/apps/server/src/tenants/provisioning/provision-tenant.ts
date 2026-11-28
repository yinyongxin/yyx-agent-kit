import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { ensureTenantRoles } from "./ensure-roles";

export type ProvisionTenantOptions = {
  /** 可选：创建租户时直接加入并授予 admin 角色（用户必须已存在） */
  initialAdminEmail?: string;
};

/**
 * 新租户初始化：
 * 1. 设置事务级 app.tenant_id（Role 受 RLS 保护）
 * 2. 创建/补齐内置 admin、member 角色及权限
 * 3. 可选：把已存在用户加入租户并授予 admin
 *
 * 必须在数据库事务中调用；任何一步失败都应回滚租户创建。
 */
export async function provisionTenant(
  tx: Prisma.TransactionClient,
  tenantId: string,
  options: ProvisionTenantOptions = {},
): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
  const { adminRoleId } = await ensureTenantRoles(tx, tenantId);

  const email = options.initialAdminEmail?.trim();
  if (!email) return;

  const user = await tx.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  if (!user) {
    throw new NotFoundException("初始管理员用户不存在，请先在用户管理中创建账号");
  }
  if (user.status !== "active") {
    throw new BadRequestException("初始管理员账号已禁用");
  }

  await tx.userTenant.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    update: { status: "active" },
    create: { userId: user.id, tenantId, status: "active" },
  });

  await tx.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRoleId } },
    update: {},
    create: { userId: user.id, roleId: adminRoleId },
  });
}
