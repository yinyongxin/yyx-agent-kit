import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { AuditContext } from "../../audit/audit-context";
import type { CreateRoleDto } from "./dto/create-role.dto";
import type { QueryRolesDto } from "./dto/query-roles.dto";
import type {
  RoleListResponseDto,
  RoleOptionDto,
  RoleResponseDto,
} from "./dto/role-response.dto";
import type { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesRepository, type RoleRow } from "./repositories/roles.repository";

const toDto = (row: RoleRow): RoleResponseDto => {
  const permissionCodes = row.permissions
    .map((item) => item.permission.code)
    .sort((a, b) => a.localeCompare(b));

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    permissionCodes,
    permissionCount: permissionCodes.length,
    userCount: row._count.users,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

/**
 * 租户角色管理。
 *
 * - 内置角色（isSystem=true）由 seed 维护，接口只读：不能改名、改权限、删除
 * - 自定义角色可创建 / 更新 / 删除；code 创建后不可改
 * - 删除前检查是否有成员仍在使用，避免把成员变成「无角色」
 */
@Injectable()
export class RolesService {
  constructor(private readonly roles: RolesRepository) {}

  async list(
    tx: Prisma.TransactionClient,
    tenantId: string,
    query: QueryRolesDto,
  ): Promise<RoleListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const { rows, total } = await this.roles.list(tx, {
      tenantId,
      skip: (page - 1) * pageSize,
      take: pageSize,
      kind: query.kind,
      keyword: query.keyword,
    });

    return { items: rows.map(toDto), total, page, pageSize };
  }

  /** 成员页角色下拉：返回当前租户全部角色，不分页 */
  options(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<RoleOptionDto[]> {
    return this.roles.options(tx, tenantId);
  }

  async get(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<RoleResponseDto> {
    const row = await this.roles.findById(tx, tenantId, id);
    if (!row) throw new NotFoundException("角色不存在");
    return toDto(row);
  }

  async create(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    const code = input.code.trim();
    if (await this.roles.findByCode(tx, tenantId, code)) {
      throw new ConflictException("角色 code 已存在");
    }

    const permissionIds = await this.resolvePermissionIds(
      tx,
      input.permissionCodes ?? [],
    );

    const created = await this.roles.create(tx, {
      tenantId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    });
    await this.roles.replacePermissions(tx, created.id, permissionIds);

    const row = await this.roles.findById(tx, tenantId, created.id);
    if (!row) throw new Error("角色创建后读取失败");
    return toDto(row);
  }

  async update(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    input: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const before = await this.roles.findById(tx, tenantId, id);
    if (!before) throw new NotFoundException("角色不存在");
    if (before.isSystem) {
      throw new ForbiddenException("内置角色不可修改");
    }
    if (
      input.name === undefined &&
      input.description === undefined &&
      input.permissionCodes === undefined
    ) {
      throw new BadRequestException("没有需要更新的字段");
    }

    AuditContext.setBefore(toDto(before));

    const permissionIds =
      input.permissionCodes === undefined
        ? undefined
        : await this.resolvePermissionIds(tx, input.permissionCodes);

    await this.roles.update(tx, id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
    });

    if (permissionIds !== undefined) {
      await this.roles.replacePermissions(tx, id, permissionIds);
    }

    return this.get(tx, tenantId, id);
  }

  async remove(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<void> {
    const before = await this.roles.findById(tx, tenantId, id);
    if (!before) throw new NotFoundException("角色不存在");
    if (before.isSystem) {
      throw new ForbiddenException("内置角色不可删除");
    }

    const userCount = await this.roles.countUsers(tx, id);
    if (userCount > 0) {
      throw new ConflictException(
        `角色仍有 ${userCount} 个成员，不能删除；请先调整成员角色`,
      );
    }

    AuditContext.setBefore(toDto(before));
    await this.roles.remove(tx, id);
  }

  /** 权限点必须存在于全局目录；不存在统一 400 */
  private async resolvePermissionIds(
    tx: Prisma.TransactionClient,
    codes: string[],
  ): Promise<string[]> {
    const unique = [...new Set(codes.map((code) => code.trim()).filter(Boolean))];
    if (unique.length === 0) return [];

    const rows = await this.roles.findPermissionsByCodes(tx, unique);
    if (rows.length !== unique.length) {
      const found = new Set(rows.map((row) => row.code));
      const missing = unique.filter((code) => !found.has(code));
      throw new BadRequestException(`权限点不存在：${missing.join(", ")}`);
    }
    return rows.map((row) => row.id);
  }
}
