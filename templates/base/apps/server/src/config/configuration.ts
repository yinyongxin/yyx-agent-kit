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

/**
 * 本地开发导航页配置（只在开发环境使用）。
 * 端口按约定从 server 端口推导：client = +73、admin = +74、portal = +75，
 * 这样 CLI 用 --port-base 生成新端口后仍然正确。
 */
export const devConfig = registerAs("dev", () => {
  const portBase = Math.floor(Number(process.env.PORT ?? 47100) / 100) * 100;
  return {
    clientPort: portBase + 73,
    adminPort: portBase + 74,
    portalPort: portBase + 75,
    postgresPort: Number(process.env.POSTGRES_PORT ?? 54732),
    redisPort: Number(process.env.REDIS_PORT ?? 46379),
    redisHost: (() => {
      try {
        return new URL(process.env.REDIS_URL ?? "").hostname || "localhost";
      } catch {
        return "localhost";
      }
    })(),
    penpotPort: Number(process.env.PENPOT_PORT ?? 9001),
    penpotMailpitPort: Number(process.env.PENPOT_MAILPIT_PORT ?? 8025),
  };
});

/** 认证配置（JWT 签发参数）；生产缺 JWT_SECRET 由 env.validation 拦截 */
export const authConfig = registerAs("auth", () => ({
  jwtSecret:
    process.env.JWT_SECRET ?? "dev_jwt_secret_change_me_at_least_32_bytes",
  issuer: process.env.JWT_ISSUER ?? "starter-api",
  audience: process.env.JWT_AUDIENCE ?? "starter-web",
  ttl: process.env.JWT_TTL ?? "15m",
}));
