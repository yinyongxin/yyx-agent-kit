import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PasswordHasher } from "@nestjs/authentication";
import { AuditContext } from "../audit/audit-context";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { MeResponseDto } from "./dto/me-response.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersRepository } from "./repositories/users.repository";

/**
 * 当前用户自助服务：个人资料与密码。
 *
 * 与平台用户管理（UsersService）区分：
 * - 只能操作当前登录用户
 * - 不修改邮箱 / 状态 / 角色
 * - 修改密码必须验证旧密码
 */
@Injectable()
export class MeService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async getProfile(userId: string): Promise<MeResponseDto> {
    const profile = await this.users.findProfile(userId);
    if (!profile) throw new NotFoundException("用户不存在");
    return profile;
  }

  tenants(userId: string) {
    return this.users.findTenants(userId);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<MeResponseDto> {
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new BadRequestException("显示名不能为空");
    }

    const before = await this.getProfile(userId);
    AuditContext.setBefore(before);

    await this.users.update(userId, { displayName });
    return this.getProfile(userId);
  }

  async changePassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<void> {
    const row = await this.users.findPasswordHash(userId);
    if (!row) throw new NotFoundException("用户不存在");
    if (!row.passwordHash) {
      throw new BadRequestException("当前账号未设置密码，不能修改密码");
    }

    const valid = await this.hasher.verify(
      input.currentPassword,
      row.passwordHash,
    );
    if (!valid) {
      throw new BadRequestException("当前密码不正确");
    }
    if (input.currentPassword === input.newPassword) {
      throw new BadRequestException("新密码不能与当前密码相同");
    }

    AuditContext.setBefore({ id: row.id, email: row.email });
    await this.users.update(userId, {
      passwordHash: await this.hasher.hash(input.newPassword),
    });
  }
}
