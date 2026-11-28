import { registerAs } from "@nestjs/config";

const isProduction = () => process.env.NODE_ENV === "production";

/** 应用级配置（端口、环境、Swagger 开关） */
export const appConfig = registerAs("app", () => ({
  port: Number(process.env.PORT ?? 47100),
  nodeEnv: process.env.NODE_ENV ?? "development",
  swaggerEnabled:
    process.env.SWAGGER_ENABLED === "true" ||
    (process.env.SWAGGER_ENABLED !== "false" && !isProduction()),
  /** 全站 API 限流默认值（IP + Controller.method 固定窗口） */
  apiRateLimitMax: Number(process.env.API_RATE_LIMIT_MAX ?? 120),
  apiRateLimitWindowSeconds: Number(
    process.env.API_RATE_LIMIT_WINDOW_SECONDS ?? 60,
  ),
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

  // 从 DATABASE_URL 解析应用连库账号（app_rw），用于开发导航页展示
  let postgresAppUser = "app_rw";
  let postgresAppPassword = "app_rw_pwd_2026";
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    postgresAppUser = decodeURIComponent(url.username) || postgresAppUser;
    postgresAppPassword = decodeURIComponent(url.password) || postgresAppPassword;
  } catch {
    // DATABASE_URL 缺失/格式异常时保持默认
  }

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
    /** 本地 Penpot MCP（tools/penpot/start-mcp.ps1）：4401 MCP、4400 插件 manifest */
    penpotMcpPort: Number(process.env.PENPOT_MCP_PORT ?? 4401),
    penpotPluginPort: Number(process.env.PENPOT_MCP_PLUGIN_PORT ?? 4400),
    /** 可观测性（docker compose --profile observability） */
    lokiPort: Number(process.env.LOKI_PORT ?? 47110),
    grafanaPort: Number(process.env.GRAFANA_PORT ?? 47111),
    tempoPort: Number(process.env.TEMPO_PORT ?? 47113),
    /** 开发导航页展示的本地凭据（仅开发环境） */
    grafanaUser: process.env.GRAFANA_USER ?? "admin",
    grafanaPassword: process.env.GRAFANA_PASSWORD ?? "starter_grafana_2026",
    postgresAppUser,
    postgresAppPassword,
    postgresAdminUser: process.env.POSTGRES_USER ?? "app",
    postgresAdminPassword: process.env.POSTGRES_PASSWORD ?? "app_dev_pwd",
    redisPassword: process.env.REDIS_PASSWORD ?? "app_redis_pwd",
    penpotUser: process.env.PENPOT_DEV_EMAIL ?? "dev@penpot.local",
    penpotPassword: process.env.PENPOT_DEV_PASSWORD ?? "penpot_dev_pwd_2026",
    seedUserEmail: process.env.SEED_USER_EMAIL ?? "admin@example.com",
    seedUserPassword: process.env.SEED_USER_PASSWORD ?? "seed_pwd_2026",
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
    /** 文件轮转：daily / hourly，按大小兜底，保留 N 个历史文件 */
    fileRotateFrequency: process.env.LOG_ROTATE_FREQUENCY ?? "daily",
    fileRotateSize: process.env.LOG_ROTATE_SIZE ?? "50m",
    fileRotateKeep: Number(process.env.LOG_ROTATE_KEEP ?? 7),
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
  /** 服务端会话（Bearer JWT 中的 sid） */
  sessionAbsoluteTtl: process.env.AUTH_SESSION_ABSOLUTE_TTL ?? "7d",
  sessionIdleTtl: process.env.AUTH_SESSION_IDLE_TTL ?? "1d",
  sessionTouchInterval: process.env.AUTH_SESSION_TOUCH_INTERVAL ?? "1m",
  /** 登录失败锁定：同邮箱+IP 窗口内失败次数上限 */
  loginMaxAttempts: Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS ?? 5),
  loginWindowSeconds: Number(process.env.AUTH_LOGIN_WINDOW_SECONDS ?? 300),
  loginLockSeconds: Number(process.env.AUTH_LOGIN_LOCK_SECONDS ?? 900),
  /** 同 IP 更高的阈值，防止批量撞库；成功登录不清零 */
  loginIpMaxAttempts: Number(process.env.AUTH_LOGIN_IP_MAX_ATTEMPTS ?? 30),
}));

/** Redis（登录限流 / 共享缓存）；未配置时相关能力 fail-open */
export const redisConfig = registerAs("redis", () => ({
  url: process.env.REDIS_URL ?? "",
}));

/** 文件上传：本地磁盘目录与单文件大小上限 */
export const filesConfig = registerAs("files", () => ({
  dir: process.env.FILES_DIR ?? "./storage/files",
  maxSizeMb: Number(process.env.FILES_MAX_SIZE_MB ?? 20),
}));
