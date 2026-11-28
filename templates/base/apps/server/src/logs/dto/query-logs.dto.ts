import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  LOG_LEVELS,
  LOG_RANGES,
  type LogLevel,
  type LogRange,
} from "../../shared";

// 前后端共用同一份枚举；在这里 re-export，调用方仍可从 dto 目录导入
export { LOG_LEVELS, LOG_RANGES };
export type { LogLevel, LogRange };

/** 日志查询条件（平台管理员） */
export class QueryLogsDto {
  @ApiPropertyOptional({
    enum: LOG_RANGES,
    default: "15m",
    description: "相对时间范围；与 start/end 同时传时以 start/end 为准",
  })
  @IsOptional()
  @IsIn(LOG_RANGES)
  range?: LogRange;

  @ApiPropertyOptional({ description: "开始时间（ISO 8601）" })
  @IsOptional()
  @IsISO8601()
  start?: string;

  @ApiPropertyOptional({ description: "结束时间（ISO 8601）" })
  @IsOptional()
  @IsISO8601()
  end?: string;

  @ApiPropertyOptional({ enum: LOG_LEVELS })
  @IsOptional()
  @IsIn(LOG_LEVELS)
  level?: LogLevel;

  @ApiPropertyOptional({ description: "精确匹配 traceId（32 位 hex）" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  traceId?: string;

  @ApiPropertyOptional({ description: "精确匹配 userId" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @ApiPropertyOptional({ description: "精确匹配 tenantId" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @ApiPropertyOptional({ description: "按路径包含过滤，如 /starter/api/tenants" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @ApiPropertyOptional({ description: "全文包含过滤（msg / url / 错误信息）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: ["backward", "forward"], default: "backward" })
  @IsOptional()
  @IsIn(["backward", "forward"])
  direction?: "backward" | "forward";
}
