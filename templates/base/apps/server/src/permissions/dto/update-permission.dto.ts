import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** 更新权限点：code 不可改（角色已按 id 引用） */
export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: "审批订单" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "允许审批订单" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
