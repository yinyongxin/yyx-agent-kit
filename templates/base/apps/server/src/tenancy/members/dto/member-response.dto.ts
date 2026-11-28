import { ApiProperty } from "@nestjs/swagger";
import { RoleDto } from "../../dto/role.dto";

export class MemberResponseDto {
  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ type: String, nullable: true, example: "user@example.com" })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true, example: "张三" })
  displayName!: string | null;

  @ApiProperty({ enum: ["active", "disabled"], description: "全局账号状态" })
  userStatus!: string;

  @ApiProperty({ enum: ["active", "suspended"], description: "在租户内的成员状态" })
  status!: string;

  @ApiProperty({ type: [RoleDto] })
  roles!: RoleDto[];

  @ApiProperty({ format: "date-time" })
  joinedAt!: string;
}

export class MemberListResponseDto {
  @ApiProperty({ type: [MemberResponseDto] })
  items!: MemberResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
