import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PasswordHasher, TokenService } from "@nestjs/authentication";
import { UsersRepository } from "./repositories/users.repository";

/**
 * 登录闭环的业务逻辑：验证邮箱+密码，签发 access token。
 *
 * 未知邮箱也走 PasswordHasher.verify（传 null 时校验 dummy hash），
 * 使响应时间不泄露「邮箱是否注册」。Controller 只做 DTO 校验与转发。
 */
@Injectable()
export class CredentialsService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async signIn(email: string, password: string) {
    const found = await this.users.findCredentials(email);
    const valid = await this.hasher.verify(password, found?.passwordHash ?? null);
    if (!valid || !found) {
      throw new UnauthorizedException("邮箱或密码不正确");
    }

    const issued = await this.tokens.issue(found.user.id);
    return { accessToken: issued.accessToken, tokenType: "Bearer" };
  }
}
