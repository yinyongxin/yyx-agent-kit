import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const ROLE_KINDS = ["system", "custom"] as const;
export type RoleKind = (typeof ROLE_KINDS)[number];

/** 租户角色列表查询 */
export class QueryRolesDto {
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

  @ApiPropertyOptional({ enum: ROLE_KINDS, description: "system=内置，custom=自定义" })
  @IsOptional()
  @IsIn(ROLE_KINDS)
  kind?: RoleKind;

  @ApiPropertyOptional({ description: "搜索 name / code / description" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;
}
