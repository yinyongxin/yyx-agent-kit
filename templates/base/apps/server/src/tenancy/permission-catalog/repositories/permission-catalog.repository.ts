import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import type { TenantPermissionDto } from "../dto/permission.dto";

/** 权限点是全局表（无 tenantId），走 `prisma.scoped` 直接读取 */
@Injectable()
export class TenantPermissionCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TenantPermissionDto[]> {
    return this.prisma.scoped.permission.findMany({
      select: { id: true, code: true, name: true, description: true },
      orderBy: { code: "asc" },
    });
  }
}
