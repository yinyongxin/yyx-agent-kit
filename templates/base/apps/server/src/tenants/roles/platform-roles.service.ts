import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { RolesService } from "../../tenancy/roles/roles.service";
import type { RoleOptionDto } from "../../tenancy/roles/dto/role-response.dto";

/** 平台级租户角色查询（当前只暴露成员管理需要的下拉选项） */
@Injectable()
export class PlatformRolesService {
  constructor(private readonly roles: RolesService) {}

  options(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<RoleOptionDto[]> {
    return this.roles.options(tx, tenantId);
  }
}
