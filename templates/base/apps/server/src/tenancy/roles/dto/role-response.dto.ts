import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RoleResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "operator" })
  code!: string;

  @ApiProperty({ example: "运营" })
  name!: string;

  @ApiProperty({ type: String, nullable: true, example: "只读运营数据" })
  description!: string | null;

  @ApiProperty({ description: "内置角色不可修改/删除" })
  isSystem!: boolean;

  @ApiProperty({ type: [String], example: ["knowledge:read"] })
  permissionCodes!: string[];

  @ApiProperty({ description: "权限点数量" })
  permissionCount!: number;

  @ApiProperty({ description: "当前租户下拥有该角色的成员数" })
  userCount!: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class RoleListResponseDto {
  @ApiProperty({ type: [RoleResponseDto] })
  items!: RoleResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class RoleOptionDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "member" })
  code!: string;

  @ApiProperty({ example: "普通成员" })
  name!: string;
}
