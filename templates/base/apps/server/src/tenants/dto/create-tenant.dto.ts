import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateTenantDto {
  @ApiProperty({ example: "Acme Inc", description: "租户名称" })
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({
    example: "acme",
    description: "URL slug，创建后不可修改；小写字母、数字、-",
  })
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-z0-9-]+$/, { message: "slug 只能包含小写字母、数字和 -" })
  slug!: string;

  @ApiPropertyOptional({
    example: "owner@example.com",
    description: "可选：创建后自动加入并授予 admin 的已存在用户邮箱",
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  initialAdminEmail?: string;
}
