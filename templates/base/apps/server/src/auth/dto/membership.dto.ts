import { ApiProperty } from "@nestjs/swagger";

/** 出参：当前用户在当前租户下的成员信息 */
export class MembershipDto {
  @ApiProperty({ format: "uuid" })
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ enum: ["owner", "admin", "member"] })
  role!: string;

  @ApiProperty({ example: "active" })
  status!: string;

  @ApiProperty({
    type: [String],
    example: ["user:read", "knowledge:read"],
    description: '当前租户下的权限点并集；owner / admin 返回 ["*"]',
  })
  permissions!: string[];
}
