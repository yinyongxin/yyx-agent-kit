import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditContext } from "../audit/audit-context";
import type { CreatePermissionDto } from "./dto/create-permission.dto";
import type {
  PermissionListResponseDto,
  PermissionResponseDto,
} from "./dto/permission-response.dto";
import type { QueryPermissionsDto } from "./dto/query-permissions.dto";
import type { UpdatePermissionDto } from "./dto/update-permission.dto";
import {
  PermissionsRepository,
  type PermissionRow,
} from "./repositories/permissions.repository";

const toDto = (row: PermissionRow): PermissionResponseDto => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  roleCount: row._count.roles,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * 全局权限点维护（平台管理员）。
 *
 * 权限点被角色通过 RolePermission 引用：code 创建后不可改，删除前检查引用数。
 * 内置权限点由 seed 维护；删除后再次 seed 会被重新创建。
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly permissions: PermissionsRepository) {}

  async list(query: QueryPermissionsDto): Promise<PermissionListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const { rows, total } = await this.permissions.list({
      skip: (page - 1) * pageSize,
      take: pageSize,
      keyword: query.keyword,
    });

    return { items: rows.map(toDto), total, page, pageSize };
  }

  async get(id: string): Promise<PermissionResponseDto> {
    const row = await this.permissions.findById(id);
    if (!row) throw new NotFoundException("权限点不存在");
    return toDto(row);
  }

  async create(input: CreatePermissionDto): Promise<PermissionResponseDto> {
    const code = input.code.trim();
    if (await this.permissions.findByCode(code)) {
      throw new ConflictException("权限点 code 已存在");
    }

    const row = await this.permissions.create({
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    });
    return toDto(row);
  }

  async update(
    id: string,
    input: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const before = await this.permissions.findById(id);
    if (!before) throw new NotFoundException("权限点不存在");
    if (input.name === undefined && input.description === undefined) {
      throw new BadRequestException("没有需要更新的字段");
    }

    AuditContext.setBefore(toDto(before));
    const row = await this.permissions.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
    });
    return toDto(row);
  }

  async remove(id: string): Promise<void> {
    const before = await this.permissions.findById(id);
    if (!before) throw new NotFoundException("权限点不存在");

    const roleCount = before._count.roles;
    if (roleCount > 0) {
      throw new ConflictException(
        `权限点已被 ${roleCount} 个角色引用，不能删除；请先在角色中移除`,
      );
    }

    AuditContext.setBefore(toDto(before));
    await this.permissions.remove(id);
  }
}
