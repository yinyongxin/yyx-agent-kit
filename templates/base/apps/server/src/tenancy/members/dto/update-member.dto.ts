import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { MEMBER_STATUSES, type MemberStatus } from "./query-members.dto";

/** 更新租户成员：状态与角色都可选，至少传一个 */
export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: MEMBER_STATUSES })
  @IsOptional()
  @IsIn(MEMBER_STATUSES)
  status?: MemberStatus;

  @ApiPropertyOptional({
    type: [String],
    example: ["admin"],
    description: "整体替换该成员在本租户的角色",
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  roleCodes?: string[];
}
