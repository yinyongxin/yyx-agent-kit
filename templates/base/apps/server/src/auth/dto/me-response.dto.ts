import { ApiProperty } from "@nestjs/swagger";

/** 当前登录用户的全局信息（不含租户上下文） */
export class MeResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ type: String, nullable: true, example: "admin@example.com" })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true, example: "示例管理员" })
  displayName!: string | null;

  @ApiProperty({ description: "是否为平台管理员（super / ops）" })
  isPlatformAdmin!: boolean;
}
