import { Injectable } from "@nestjs/common";
import type { TenantPermissionDto } from "./dto/permission.dto";
import { TenantPermissionCatalogRepository } from "./repositories/permission-catalog.repository";

@Injectable()
export class TenantPermissionCatalogService {
  constructor(
    private readonly permissions: TenantPermissionCatalogRepository,
  ) {}

  list(): Promise<TenantPermissionDto[]> {
    return this.permissions.list();
  }
}
