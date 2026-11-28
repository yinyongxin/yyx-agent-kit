import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/** 创建权限点：code 形如 resource:action */
export class CreatePermissionDto {
  @ApiProperty({
    example: "order:approve",
    description: "小写 resource:action，可多段，如 order:item:read",
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_-]*(:[a-z0-9][a-z0-9_-]*)+$/, {
    message: "code 必须是小写 resource:action 形式，只能包含小写字母、数字、-、_ 和 :",
  })
  code!: string;

  @ApiProperty({ example: "审批订单" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: "允许审批订单" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
