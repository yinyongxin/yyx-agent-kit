import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditLogDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  tenantId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  actorUserId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: "admin@example.com" })
  actorLabel!: string | null;

  @ApiProperty({ example: "tenant.create" })
  action!: string;

  @ApiProperty({ example: "tenant" })
  resource!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  resourceId!: string | null;

  @ApiProperty({ enum: ["success", "failure"] })
  result!: "success" | "failure";

  @ApiPropertyOptional({ type: String, nullable: true })
  summary!: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  before!: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  after!: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  ip!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  traceId!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogDto] })
  items!: AuditLogDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
