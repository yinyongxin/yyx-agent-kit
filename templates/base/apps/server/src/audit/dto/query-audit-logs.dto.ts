import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const AUDIT_RESULTS = ["success", "failure"] as const;
export type AuditResultValue = (typeof AUDIT_RESULTS)[number];

/** 审计日志查询条件（平台管理员） */
export class QueryAuditLogsDto {
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

  @ApiPropertyOptional({ description: "动作精确匹配，如 tenant.create" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ description: "资源类型精确匹配，如 tenant" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  resource?: string;

  @ApiPropertyOptional({ enum: AUDIT_RESULTS })
  @IsOptional()
  @IsIn(AUDIT_RESULTS)
  result?: AuditResultValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: "32 位 traceId" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  traceId?: string;

  @ApiPropertyOptional({ description: "包含匹配 summary / actorLabel / resourceId" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional({ description: "开始时间（ISO 8601）" })
  @IsOptional()
  @IsISO8601()
  start?: string;

  @ApiPropertyOptional({ description: "结束时间（ISO 8601）" })
  @IsOptional()
  @IsISO8601()
  end?: string;
}
