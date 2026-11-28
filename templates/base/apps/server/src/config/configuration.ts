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
    /** 本地 Penpot MCP（pnpm penpot:mcp）：4401 MCP、4400 插件 manifest */
    penpotMcpPort: Number(process.env.PENPOT_MCP_PORT ?? 4401),
    penpotPluginPort: Number(process.env.PENPOT_MCP_PLUGIN_PORT ?? 4400),
    /** 可观测性（docker compose --profile observability） */
    lokiPort: Number(process.env.LOKI_PORT ?? 47110),
    grafanaPort: Number(process.env.GRAFANA_PORT ?? 47111),
    tempoPort: Number(process.env.TEMPO_PORT ?? 47113),
    /** 开发导航页展示的 Grafana 凭据（仅开发环境） */
    grafanaUser: process.env.GRAFANA_USER ?? "admin",
    grafanaPassword: process.env.GRAFANA_PASSWORD ?? "starter_grafana_2026",
  };
});

/** 日志配置（pino / nestjs-pino / Loki 查询） */
export const loggingConfig = registerAs("logging", () => {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  return {
    level: process.env.LOG_LEVEL ?? (nodeEnv === "production" ? "info" : "debug"),
    httpBody:
      process.env.LOG_HTTP_BODY !== undefined
        ? process.env.LOG_HTTP_BODY === "true"
        : nodeEnv !== "production",
    bodyLimit: Number(process.env.LOG_BODY_LIMIT ?? 16384),
    /** 额外写一份 JSON 日志到文件（相对进程 cwd）；生产不配则只写 stdout */
    file: process.env.LOG_FILE ?? "",
    /** 管理端日志页查询用；未配置时日志查询 API 返回 503 */
    lokiUrl: process.env.LOKI_URL ?? "http://localhost:47110",
    /** Loki 里的 service label，需与 Alloy 配置一致 */
    serviceName: process.env.LOG_SERVICE_NAME ?? "starter-api",
    /** 慢 SQL 阈值（ms）；<=0 关闭 */
    slowSqlMs: Number(process.env.SLOW_SQL_MS ?? 100),
    /** 是否在慢 SQL 日志里带参数（默认关闭，参数可能含业务数据） */
    slowSqlParams: process.env.SLOW_SQL_LOG_PARAMS === "true",
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
