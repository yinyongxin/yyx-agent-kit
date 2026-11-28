import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { UserStatus } from "./query-users.dto";

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: "user@example.com" })
  email!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: "张三" })
  displayName!: string | null;

  @ApiProperty({ enum: ["active", "disabled"] })
  status!: UserStatus;

  @ApiProperty({ description: "所属租户数量" })
  tenantCount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
