import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { CreateTenantDto } from "./create-tenant.dto";

/** slug 创建后不可改，更新只允许 name / status */
export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ["slug"] as const),
) {
  @ApiPropertyOptional({ enum: ["active", "suspended"] })
  @IsOptional()
  @IsIn(["active", "suspended"])
  status?: "active" | "suspended";
}
