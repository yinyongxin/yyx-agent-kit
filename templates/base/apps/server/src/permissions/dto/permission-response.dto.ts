import { ApiProperty } from "@nestjs/swagger";

export class PermissionResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "order:approve" })
  code!: string;

  @ApiProperty({ example: "审批订单" })
  name!: string;

  @ApiProperty({ type: String, nullable: true, example: "允许审批订单" })
  description!: string | null;

  @ApiProperty({ description: "引用该权限点的角色数" })
  roleCount!: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class PermissionListResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  items!: PermissionResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
