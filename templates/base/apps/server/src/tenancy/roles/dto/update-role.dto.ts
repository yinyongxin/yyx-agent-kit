import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/** 更新角色：code 不可改；permissionCodes 传空数组表示清空权限 */
export class UpdateRoleDto {
  @ApiPropertyOptional({ example: "运营" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "只读运营数据" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "整体替换角色权限；空数组表示清空",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  permissionCodes?: string[];
}
