import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  PasswordHasher,
  SessionService,
  TokenService,
} from "@nestjs/authentication";
import { AuditService } from "../audit/audit.service";
import { AuthUsersRepository } from "./repositories/auth-users.repository";
import { LoginThrottleService } from "./login-throttle.service";

/**
 * 登录闭环的业务逻辑：验证邮箱密码，签发 access token。
 * 未知邮箱也走 PasswordHasher.verify（传 null 时校验 dummy hash），
 * 使响应时间不泄露「邮箱是否注册」。Controller 只做 DTO 校验与转发。
 *
 * 登录成功 / 失败都写审计日志（append-only）。失败只记邮箱与原因，不记密码。
 */
@Injectable()
export class CredentialsService {
  constructor(
    private readonly users: AuthUsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async signIn(email: string, password: string, ip: string, userAgent: string) {
    await this.throttle.assertAllowed(email, ip);

    const found = await this.users.findCredentials(email);
    const valid = await this.hasher.verify(password, found?.passwordHash ?? null);
    if (!valid || !found) {
      await this.throttle.recordFailure(email, ip);
      await this.audit.record({
        action: "auth.sign_in",
        resource: "session",
        actorLabel: email,
        result: "failure",
        summary: found ? "密码错误" : "邮箱不存在或已停用",
      });
      throw new UnauthorizedException("邮箱或密码不正确");
    }

    await this.throttle.recordSuccess(email, ip);
    const session = await this.sessions.create(found.user.id, {
      metadata: { ip, userAgent },
    });
    const issued = await this.tokens.issue(found.user.id, {
      claims: { sid: session.token },
    });
    await this.audit.record({
      action: "auth.sign_in",
      resource: "session",
      resourceId: session.session.id,
      actorUserId: found.user.id,
      actorLabel: email,
      result: "success",
    });
    return { accessToken: issued.accessToken, tokenType: "Bearer" };
  }
}
