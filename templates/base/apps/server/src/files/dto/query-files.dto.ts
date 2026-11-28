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

export const FILE_CATEGORIES = ["image", "document", "other"] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

/** 租户文件列表查询 */
export class QueryFilesDto {
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

  @ApiPropertyOptional({ enum: FILE_CATEGORIES })
  @IsOptional()
  @IsIn(FILE_CATEGORIES)
  category?: FileCategory;

  @ApiPropertyOptional({ description: "搜索文件名" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;
}
