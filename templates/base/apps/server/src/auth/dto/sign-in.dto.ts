import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

/** 入参：邮箱密码登录 */
export class SignInDto {
  @ApiProperty({ example: "admin@example.com", description: "登录邮箱" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "********", description: "登录密码" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

/** 出参：只返回 access token，不暴露用户字段 */
export class SignInResponseDto {
  @ApiProperty({ description: "Bearer access token" })
  accessToken!: string;

  @ApiProperty({ example: "Bearer" })
  tokenType!: string;
}
