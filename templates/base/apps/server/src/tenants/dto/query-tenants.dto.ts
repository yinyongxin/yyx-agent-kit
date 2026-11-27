import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class QueryTenantsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ enum: ["active", "suspended"] })
  @IsOptional()
  @IsIn(["active", "suspended"])
  status?: "active" | "suspended";

  @ApiPropertyOptional({ description: "模糊匹配 name / slug" })
  @IsOptional()
  @IsString()
  keyword?: string;
}
