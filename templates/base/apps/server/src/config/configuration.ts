import { registerAs } from "@nestjs/config";

const isProduction = () => process.env.NODE_ENV === "production";

/** 应用级配置（端口、环境、Swagger 开关） */
export const appConfig = registerAs("app", () => ({
  port: Number(process.env.PORT ?? 47100),
  nodeEnv: process.env.NODE_ENV ?? "development",
  swaggerEnabled:
    process.env.SWAGGER_ENABLED === "true" ||
    (process.env.SWAGGER_ENABLED !== "false" && !isProduction()),
}));

/** 数据访问配置（运行时连接串；迁移用 MIGRATE_DATABASE_URL 在 prisma7.config.ts 单独读） */
export const databaseConfig = registerAs("database", () => ({
  url: process.env.DATABASE_URL ?? "",
}));

/** 认证配置（JWT 签发参数）；生产缺 JWT_SECRET 由 env.validation 拦截 */
export const authConfig = registerAs("auth", () => ({
  jwtSecret:
    process.env.JWT_SECRET ?? "dev_jwt_secret_change_me_at_least_32_bytes",
  issuer: process.env.JWT_ISSUER ?? "starter-api",
  audience: process.env.JWT_AUDIENCE ?? "starter-web",
  ttl: process.env.JWT_TTL ?? "15m",
}));
