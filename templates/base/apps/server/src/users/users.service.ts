import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PasswordHasher } from "@nestjs/authentication";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import { AuditContext } from "../audit/audit-context";
import { UsersRepository, type UserRow } from "./users.repository";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { QueryUsersDto } from "./dto/query-users.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { UserListResponseDto, UserResponseDto } from "./dto/user-response.dto";

const toDto = (row: UserRow): UserResponseDto => ({
  id: row.id,
  email: row.email,
  displayName: row.displayName,
  status: row.status,
  tenantCount: row._count.tenants,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async list(query: QueryUsersDto): Promise<UserListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await this.users.list({
      skip: (page - 1) * pageSize,
      take: pageSize,
      status: query.status,
      keyword: query.keyword,
    });

    return { items: rows.map(toDto), total, page, pageSize };
  }

  async get(id: string): Promise<UserResponseDto> {
    const row = await this.users.findById(id);
    if (!row) throw new NotFoundException("用户不存在");
    return toDto(row);
  }

  async create(input: CreateUserDto): Promise<UserResponseDto> {
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictException("邮箱已存在");
    }

    const row = await this.users.create({
      authSubject: `local:${randomUUID()}`,
      email: input.email,
      displayName: input.displayName ?? null,
      passwordHash: await new PasswordHasher().hash(input.password),
      status: input.status ?? "active",
    });
    return toDto(row);
  }

  async update(id: string, input: UpdateUserDto): Promise<UserResponseDto> {
    const before = await this.get(id);
    AuditContext.setBefore(before);

    if (input.email && input.email !== before.email) {
      const existing = await this.users.findByEmail(input.email);
      if (existing && existing.id !== id) throw new ConflictException("邮箱已存在");
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = input.email;
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.status !== undefined) data.status = input.status;
    if (input.password) {
      data.passwordHash = await new PasswordHasher().hash(input.password);
    }

    const row = await this.users.update(id, data);
    return toDto(row);
  }

  /** 删除用户会级联移除其租户成员关系与角色；不允许删除当前登录用户 */
  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new ForbiddenException("不能删除当前登录用户");
    }

    const before = await this.get(id);
    AuditContext.setBefore(before);
    await this.users.remove(id);
  }
}
