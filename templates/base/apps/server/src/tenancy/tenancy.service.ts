import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import type { RoleDto } from "./dto/role.dto";

@Injectable()
export class TenancyService {
  /** 租户表查询走调用方传入的事务客户端（RLS 生效），Controller 只负责转发。 */
  listRoles(tx: Prisma.TransactionClient): Promise<RoleDto[]> {
    return tx.role.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
  }
}
