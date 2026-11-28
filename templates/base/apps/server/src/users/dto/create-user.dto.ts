import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { USER_STATUSES, type UserStatus } from "./query-users.dto";

/** 创建用户：本地邮箱密码账号 */
export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiPropertyOptional({ example: "张三" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({ minLength: 8, example: "change_me_2026" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({ enum: USER_STATUSES, default: "active" })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;
}
