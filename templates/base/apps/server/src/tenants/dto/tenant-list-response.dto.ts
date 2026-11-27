import { ApiProperty } from "@nestjs/swagger";
import { TenantResponseDto } from "./tenant-response.dto";

export class TenantListResponseDto {
  @ApiProperty({ type: [TenantResponseDto] })
  items!: TenantResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
