import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: string; // Authentik 用户唯一标识
  tenantId: string;
  userId: string; // 业务库用户 ID
}

/**
 * 本地 JWT 校验。OIDC 回调成功后由后端签发这种 JWT（含 sub/tenantId/userId）。
 * 暂不接 Google：认证入口留空，后续在 AuthModule 里加 OIDC 策略 + callback 即可。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "dev_jwt_secret_change_me",
    });
  }

  async validate(payload: JwtPayload) {
    return {
      authSubject: payload.sub,
      tenantId: payload.tenantId,
      userId: payload.userId,
    };
  }
}
