import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** 当前用户修改密码：必须校验旧密码 */
export class ChangePasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 72, description: "当前密码" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  currentPassword!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, description: "新密码，至少 8 位" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
