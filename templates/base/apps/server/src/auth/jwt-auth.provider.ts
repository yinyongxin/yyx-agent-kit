import { Injectable } from "@nestjs/common";
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from "@nestjs/authentication";
import { UsersRepository } from "./users.repository";
import type { User } from "./user.types";

/**
 * Bearer JWT 凭证 provider：验证模块签发的 access token，再从业务库加载用户。
 * 这是官方文档 Quick Start 的标准写法（credential provider 是普通的可注入类）。
 * 生产把 accessToken.key 放进密钥管理，并把 NODE_ENV=production + 注册 store（见 README TODO）。
 */
@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly users: UsersRepository,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  validate({ sub }: JwtClaims) {
    return sub ? this.users.findById(sub) : null;
  }
}

