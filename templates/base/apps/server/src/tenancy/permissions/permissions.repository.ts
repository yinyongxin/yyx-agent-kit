import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { PermissionDto } from "./dto/permission.dto";

/** 权限点是全局表（无 tenantId），走 `prisma.scoped` 直接读取 */
@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PermissionDto[]> {
    const rows = await this.prisma.scoped.permission.findMany({
      select: { id: true, code: true, name: true, description: true },
      orderBy: { code: "asc" },
    });
    return rows;
  }
}
