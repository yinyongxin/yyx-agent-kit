import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

/**
 * 添加租户成员：按邮箱添加已存在的全局用户。
 *
 * 模板不向租户管理员暴露「全局用户搜索」接口，避免跨租户枚举；
 * 需要新增账号时由平台管理员先在「用户管理」创建。
 */
export class AddMemberDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["member"],
    description: "角色 code，默认 member；必须是当前租户已有角色",
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  roleCodes?: string[];
}
