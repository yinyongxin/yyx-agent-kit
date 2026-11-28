import { ApiProperty } from "@nestjs/swagger";

/** 出参：当前用户所属租户的摘要（不含内部字段） */
export class TenantSummaryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ format: "date-time" })
  joinedAt!: Date;
}
