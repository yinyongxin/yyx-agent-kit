import { ApiProperty } from "@nestjs/swagger";

/** 出参：租户内角色（只暴露对外字段） */
export class RoleDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "admin" })
  code!: string;

  @ApiProperty({ example: "管理员" })
  name!: string;
}
