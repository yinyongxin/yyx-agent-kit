import type { Prisma } from "../../generated/prisma/client";
import { PERMISSION_TEMPLATES, ROLE_TEMPLATES } from "./role-templates";

/**
 * 确保全局权限点存在（seed / 新建租户共用）。
 * Permission 是全局表，不需要 tenant 上下文。
 */
export async function ensurePermissions(
  tx: Prisma.TransactionClient,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const permission of PERMISSION_TEMPLATES) {
    const row = await tx.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: { code: permission.code, name: permission.name },
    });
    ids.set(permission.code, row.id);
  }
  return ids;
}

/**
 * 确保租户存在内置角色并绑定模板权限。
 *
 * Role 受 RLS 保护：调用方必须已在事务内设置 `app.tenant_id`。
 * 返回 admin 角色 id，供「初始管理员」绑定。
 */
export async function ensureTenantRoles(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<{ adminRoleId: string }> {
  const permissionIds = await ensurePermissions(tx);
  let adminRoleId = "";

  for (const role of ROLE_TEMPLATES) {
    const row = await tx.role.upsert({
      where: { tenantId_code: { tenantId, code: role.code } },
      update: { name: role.name, description: role.description },
      create: {
        tenantId,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });

    const codes = role.all
      ? PERMISSION_TEMPLATES.map((permission) => permission.code)
      : PERMISSION_TEMPLATES.filter((permission) =>
          permission.code.endsWith(":read"),
        ).map((permission) => permission.code);

    for (const code of codes) {
      const permissionId = permissionIds.get(code);
      if (!permissionId) continue;
      await tx.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: row.id, permissionId },
        },
        update: {},
        create: { roleId: row.id, permissionId },
      });
    }

    if (role.code === "admin") adminRoleId = row.id;
  }

  return { adminRoleId };
}
