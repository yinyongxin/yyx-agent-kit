import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { AuditContext } from "../../audit/audit-context";
import type { RoleDto } from "../dto/role.dto";
import type { AddMemberDto } from "./dto/add-member.dto";
import type { MemberListResponseDto, MemberResponseDto } from "./dto/member-response.dto";
import type { QueryMembersDto } from "./dto/query-members.dto";
import type { UpdateMemberDto } from "./dto/update-member.dto";
import { MembersRepository, type MemberRow } from "./members.repository";

const DEFAULT_ROLE_CODE = "member";

const toDto = (row: MemberRow, roles: RoleDto[]): MemberResponseDto => ({
  userId: row.userId,
  email: row.user.email,
  displayName: row.user.displayName,
  userStatus: row.user.status,
  status: row.status,
  roles,
  joinedAt: row.joinedAt.toISOString(),
});

/**
 * 租户成员管理。
 *
 * 只改「成员关系」：UserTenant（加入/停用/移除）与当前租户下的 UserRole。
 * 不修改全局 User 本身（邮箱、密码、账号状态由平台用户管理负责）。
 */
@Injectable()
export class MembersService {
  constructor(private readonly members: MembersRepository) {}

  async list(
    tx: Prisma.TransactionClient,
    tenantId: string,
    query: QueryMembersDto,
  ): Promise<MemberListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const { rows, total, roles } = await this.members.list(tx, {
      tenantId,
      skip: (page - 1) * pageSize,
      take: pageSize,
      status: query.status,
      keyword: query.keyword,
    });

    const rolesByUser = new Map<string, RoleDto[]>();
    for (const item of roles) {
      const list = rolesByUser.get(item.userId) ?? [];
      list.push(item.role);
      rolesByUser.set(item.userId, list);
    }

    return {
      items: rows.map((row) => toDto(row, rolesByUser.get(row.userId) ?? [])),
      total,
      page,
      pageSize,
    };
  }

  async add(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: AddMemberDto,
  ): Promise<MemberResponseDto> {
    const user = await this.members.findUserByEmail(tx, input.email.trim());
    if (!user) {
      throw new NotFoundException("用户不存在，请先在「用户管理」中创建账号");
    }
    if (user.status !== "active") {
      throw new BadRequestException("用户已被禁用，不能加入租户");
    }

    const existing = await this.members.findMembership(tx, tenantId, user.id);
    if (existing) {
      throw new ConflictException("用户已是该租户成员");
    }

    const roles = await this.resolveRoles(
      tx,
      tenantId,
      input.roleCodes?.length ? input.roleCodes : [DEFAULT_ROLE_CODE],
    );

    await this.members.createMembership(tx, {
      tenantId,
      userId: user.id,
      status: "active",
      roleIds: roles.map((role) => role.id),
    });

    const row = await this.members.findMembership(tx, tenantId, user.id);
    if (!row) throw new Error("成员创建后读取失败");
    return toDto(row, await this.members.findRolesForUser(tx, tenantId, user.id));
  }

  async update(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    input: UpdateMemberDto,
    actorUserId: string,
  ): Promise<MemberResponseDto> {
    if (userId === actorUserId) {
      throw new ForbiddenException("不能修改自己的租户成员关系");
    }
    if (input.status === undefined && input.roleCodes === undefined) {
      throw new BadRequestException("没有需要更新的字段");
    }

    const beforeRow = await this.members.findMembership(tx, tenantId, userId);
    if (!beforeRow) throw new NotFoundException("成员不存在");
    const beforeRoles = await this.members.findRolesForUser(tx, tenantId, userId);
    AuditContext.setBefore(toDto(beforeRow, beforeRoles));

    let roles = beforeRoles;
    if (input.roleCodes !== undefined) {
      roles = await this.resolveRoles(tx, tenantId, input.roleCodes);
    }

    const row = await this.members.updateMembership(
      tx,
      tenantId,
      userId,
      input.status !== undefined ? { status: input.status } : {},
    );

    if (input.roleCodes !== undefined) {
      await this.members.replaceRoles(
        tx,
        tenantId,
        userId,
        roles.map((role) => role.id),
      );
    }

    return toDto(row, roles);
  }

  async remove(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    actorUserId: string,
  ): Promise<void> {
    if (userId === actorUserId) {
      throw new ForbiddenException("不能移除自己");
    }

    const beforeRow = await this.members.findMembership(tx, tenantId, userId);
    if (!beforeRow) throw new NotFoundException("成员不存在");
    AuditContext.setBefore(
      toDto(
        beforeRow,
        await this.members.findRolesForUser(tx, tenantId, userId),
      ),
    );

    await this.members.removeMembership(tx, tenantId, userId);
  }

  /** 校验角色 code 都属于当前租户；不存在时统一 400，避免把用户加进「没有权限」的成员关系 */
  private async resolveRoles(
    tx: Prisma.TransactionClient,
    tenantId: string,
    codes: string[],
  ): Promise<RoleDto[]> {
    const unique = [...new Set(codes)];
    const roles = await this.members.findRolesByCodes(tx, tenantId, unique);
    if (roles.length !== unique.length) {
      const found = new Set(roles.map((role) => role.code));
      const missing = unique.filter((code) => !found.has(code));
      throw new BadRequestException(`角色不存在：${missing.join(", ")}`);
    }
    return roles;
  }
}
