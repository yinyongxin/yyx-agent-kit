import { Injectable } from "@nestjs/common";
import type { PermissionDto } from "./dto/permission.dto";
import { PermissionsRepository } from "./permissions.repository";

@Injectable()
export class PermissionsService {
  constructor(private readonly permissions: PermissionsRepository) {}

  list(): Promise<PermissionDto[]> {
    return this.permissions.list();
  }
}
