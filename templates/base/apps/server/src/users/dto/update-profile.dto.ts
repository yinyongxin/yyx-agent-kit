import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** 当前用户可自行修改的资料 */
export class UpdateProfileDto {
  @ApiProperty({ example: "张三", minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;
}
