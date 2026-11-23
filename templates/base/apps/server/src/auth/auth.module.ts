import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { PermissionsGuard } from "./permissions.guard";

/**
 * 认证模块（骨架，默认未激活）。
 *
 * 现状：租户模型、JWT 策略、权限守卫都就绪，但不挂全局守卫 —— 模板现有接口
 * （health / todos）无需登录即可跑，方便先验证基础设施。
 *
 * 接入 Authentik/Google 时：
 *   1. 在本模块加 OIDC 策略 + /auth/callback，用 code 换 token 后签本地 JWT
 *      （含 sub / tenantId / userId，见 jwt.strategy.ts 的 JwtPayload）
 *   2. 在 app.module.ts 的 providers 里启用全局守卫：
 *      { provide: APP_GUARD, useClass: AuthGuard("jwt") }
 *      { provide: APP_GUARD, useClass: PermissionsGuard }
 *   3. health 接口用 @Public() 豁免（需加 @nestjs/throttler 类似的 public 装饰器机制）
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev_jwt_secret_change_me",
      signOptions: { expiresIn: "30m" },
    }),
  ],
  providers: [JwtStrategy, PermissionsGuard],
  exports: [JwtModule, PermissionsGuard],
})
export class AuthModule {}
