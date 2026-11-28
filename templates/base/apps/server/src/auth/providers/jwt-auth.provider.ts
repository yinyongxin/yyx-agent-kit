import { Injectable } from "@nestjs/common";
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  SessionService,
  type JwtClaims,
} from "@nestjs/authentication";
import { AuthUsersRepository } from "../repositories/auth-users.repository";
import type { User } from "../user.types";

/**
 * Bearer JWT 凭证 provider：验证模块签发的 access token，再从业务库加载用户。
 * 这是官方文档 Quick Start 的标准写法（credential provider 是普通的可注入类）。
 * 生产把 accessToken.key 放进密钥管理，并把 NODE_ENV=production + 注册 store（见 README TODO）。
 */
@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly users: AuthUsersRepository,
    private readonly sessions: SessionService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  async validate({ sub, sid }: JwtClaims) {
    if (!sub || typeof sid !== "string") return null;

    const session = await this.sessions.validate(sid);
    if (!session || session.userId !== sub) return null;

    const user = await this.users.findById(sub);
    if (!user) {
      await this.sessions.discard(session.id);
      return null;
    }
    return { ...user, sessionId: session.id };
  }
}

