import { ApiProperty } from "@nestjs/swagger";

/** 权限点目录（全局定义，只读；租户内用于角色分配） */
export class TenantPermissionDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "knowledge:read" })
  code!: string;

  @ApiProperty({ example: "查看知识库" })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;
}
