import { ApiProperty } from "@nestjs/swagger";

/** 出参：运维探活 */
export class HealthDto {
  @ApiProperty({ example: "ok" })
  status!: string;
}
