import { Module } from "@nestjs/common";
import {
  AuthenticationModule,
} from "@nestjs/authentication";
import { AuthorizationModule } from "@nestjs/authorization";
import { JwtAuth } from "./jwt-auth.provider";
import { UsersRepository } from "./users.repository";

/**
 * 认证（@nestjs/authentication）+ 授权（@nestjs/authorization）官方模块。
 *
 * 当前是最小闭环：Bearer JWT 凭证 provider + 全局 guard（除 @Public() 路由）。
 * health 用 @Public() 豁免；其余路由需要登录。
 *
 * 生产上线前按官网文档补齐（见 docs/pitfalls.md #16 与 README TODO）：
 *   1. 注册 6 个 store（sessions / refreshTokens / mfa / magicLinks / oidcStates / emailTokens）
 *      到同一个 PostgreSQL（写 Prisma store，跑官方 contract tests）
 *   2. Google OIDC：oidc.providers 加 google() + 环境变量 GOOGLE_CLIENT_ID/SECRET
 *   3. TOTP 2FA / magic link / 密码重置：按官网对应章节配置
 *   4. 微信扫码：oidc.providers 自定义 provider（微信非标准 OIDC，需自己实现）
 *   5. 多平台共享用户库时，每个应用的 mfa / accessToken 配置必须一致
 */
@Module({
  imports: [
    AuthenticationModule.forRoot({
      accessToken: {
        key: process.env.JWT_SECRET ?? "dev_jwt_secret_change_me_at_least_32_bytes",
        issuer: "starter-api",
        audience: "starter-web",
        ttl: "15m",
      },
      allowInMemoryStorage: true, // 仅开发；生产注册 store 后去掉
    }),
    AuthorizationModule.forRoot(),
  ],
  providers: [UsersRepository, JwtAuth],
  exports: [UsersRepository],
})
export class AuthModule {}
