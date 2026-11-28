import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/** 创建自定义角色；内置角色由 seed 维护，不走接口 */
export class CreateRoleDto {
  @ApiProperty({ example: "operator", description: "小写字母开头，可含数字、-、_" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_-]{1,49}$/, {
    message: "code 必须以小写字母开头，只能包含小写字母、数字、- 和 _",
  })
  code!: string;

  @ApiProperty({ example: "运营" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: "只读运营数据" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["knowledge:read"],
    description: "权限点 code；不传表示空角色",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  permissionCodes?: string[];
}
