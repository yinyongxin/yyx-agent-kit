import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from "class-validator";

/** 启动时校验的环境变量（缺失/格式错误直接启动失败，不等到运行时） */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  AUTH_SESSION_ABSOLUTE_TTL?: string;

  @IsOptional()
  @IsString()
  AUTH_SESSION_IDLE_TTL?: string;

  @IsOptional()
  @IsString()
  AUTH_SESSION_TOUCH_INTERVAL?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsInt()
  AUTH_LOGIN_MAX_ATTEMPTS?: number;

  @IsOptional()
  @IsInt()
  AUTH_LOGIN_WINDOW_SECONDS?: number;

  @IsOptional()
  @IsInt()
  AUTH_LOGIN_LOCK_SECONDS?: number;

  @IsOptional()
  @IsInt()
  AUTH_LOGIN_IP_MAX_ATTEMPTS?: number;

  @IsOptional()
  @IsInt()
  PORT?: number;

  @IsOptional()
  @IsIn(["true", "false"])
  SWAGGER_ENABLED?: string;

  @IsOptional()
  @IsInt()
  API_RATE_LIMIT_MAX?: number;

  @IsOptional()
  @IsInt()
  API_RATE_LIMIT_WINDOW_SECONDS?: number;

  @IsOptional()
  @IsString()
  TRUST_PROXY?: string;

  @IsOptional()
  @IsIn(["development", "production", "test"])
  NODE_ENV?: string;

  @IsOptional()
  @IsIn(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
  LOG_LEVEL?: string;

  @IsOptional()
  @IsIn(["true", "false"])
  LOG_HTTP_BODY?: string;

  @IsOptional()
  @IsInt()
  LOG_BODY_LIMIT?: number;

  @IsOptional()
  @IsString()
  LOG_FILE?: string;

  @IsOptional()
  @IsIn(["daily", "hourly"])
  LOG_ROTATE_FREQUENCY?: string;

  @IsOptional()
  @IsString()
  LOG_ROTATE_SIZE?: string;

  @IsOptional()
  @IsInt()
  LOG_ROTATE_KEEP?: number;

  @IsOptional()
  @IsString()
  LOKI_URL?: string;

  @IsOptional()
  @IsString()
  LOG_SERVICE_NAME?: string;

  @IsOptional()
  @IsInt()
  SLOW_SQL_MS?: number;

  @IsOptional()
  @IsIn(["true", "false"])
  SLOW_SQL_LOG_PARAMS?: string;
}

export const validateEnv = (config: Record<string, unknown>) => {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(", "))
      .join("; ");
    throw new Error(`环境变量校验失败：${messages}`);
  }

  if (process.env.NODE_ENV === "production" && !config.JWT_SECRET) {
    throw new Error("生产环境必须配置 JWT_SECRET（至少 32 字节）");
  }

  return config;
};
