import { ApiProperty } from "@nestjs/swagger";

export class SessionResponseDto {
  @ApiProperty({ description: "会话 id（SHA-256），用于撤销" })
  id!: string;

  @ApiProperty({ description: "是否为当前请求使用的会话" })
  current!: boolean;

  @ApiProperty({ type: String, example: "Chrome / Windows", nullable: true })
  device!: string | null;

  @ApiProperty({ type: String, example: "127.0.0.1", nullable: true })
  ip!: string | null;

  @ApiProperty({ type: String, nullable: true })
  userAgent!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  lastActiveAt!: string;

  @ApiProperty({ format: "date-time" })
  expiresAt!: string;
}
