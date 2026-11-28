import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  AuthenticationModule,
  type Duration,
} from "@nestjs/authentication";
import { AuthorizationModule } from "@nestjs/authorization";
import { JwtAuth } from "./providers/jwt-auth.provider";
import { AuthUsersRepository } from "./repositories/auth-users.repository";
import { TenantMembershipGuard } from "./guards/tenant-membership.guard";
import { AuthController } from "./auth.controller";
import { CredentialsService } from "./credentials.service";
import { LoginThrottleService } from "./login-throttle.service";

/**
 * 认证（@nestjs/authentication）+ 授权（@nestjs/authorization）官方模块。
 *
 * Bearer JWT 凭证 provider + 全局 guard（除 @Public() 路由）。
 * health 与 sign-in 用 @Public() 豁免；其余路由需要登录。
 *
 * refreshToken: false —— 只签短期 access token，不写 refreshTokens store。
 * 客户端是 CLI / 前端 Bearer token，不需要 refresh token；生产也不必为此注册 store。
 *
 * 生产上线前按官网文档补齐（见 docs/guides/pitfalls.md #16 与 README TODO）：
 *   1. 注册实际用到的 store（sessions / mfa / magicLinks / oidcStates / emailTokens）
 *      到同一个 PostgreSQL（写 Prisma store，跑官方 contract tests）
 *   2. Google OIDC：oidc.providers 加 google() + 环境变量 GOOGLE_CLIENT_ID/SECRET
 *   3. TOTP 2FA / magic link / 密码重置：按官网对应章节配置
 *   4. 微信扫码：oidc.providers 自定义 provider（微信非标准 OIDC，需自己实现）
 *   5. 多平台共享用户库时，每个应用的 mfa / accessToken 配置必须一致
 */
@Module({
  imports: [
    AuthenticationModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        accessToken: {
          key: config.getOrThrow<string>("auth.jwtSecret"),
          issuer: config.getOrThrow<string>("auth.issuer"),
          audience: config.getOrThrow<string>("auth.audience"),
          ttl: config.getOrThrow<string>("auth.ttl") as Duration,
        },
        refreshToken: false,
        allowInMemoryStorage: true, // 仅开发；生产注册实际用到的 store 后去掉
      }),
    }),
    AuthorizationModule.forRoot(),
  ],
  controllers: [AuthController],
  // PasswordHasher 由 AuthenticationModule 导出，复用它的实例（不要在此重复注册）
  providers: [
    AuthUsersRepository,
    JwtAuth,
    TenantMembershipGuard,
    CredentialsService,
    LoginThrottleService,
  ],
  exports: [AuthUsersRepository, TenantMembershipGuard, CredentialsService],
})
export class AuthModule {}
