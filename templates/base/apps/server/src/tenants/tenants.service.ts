import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Tenant } from "@/generated/prisma/client";
import { AuditContext } from "@/audit/audit-context";
import type { CreateTenantDto } from "./dto/create-tenant.dto";
import type { QueryTenantsDto } from "./dto/query-tenants.dto";
import type { TenantListResponseDto } from "./dto/tenant-list-response.dto";
import type { TenantResponseDto } from "./dto/tenant-response.dto";
import type { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantsRepository } from "./repositories/tenants.repository";

const toTenantDto = (tenant: Tenant): TenantResponseDto => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  status: tenant.status,
  createdAt: tenant.createdAt,
  updatedAt: tenant.updatedAt,
});

@Injectable()
export class TenantsService {
  constructor(private readonly tenants: TenantsRepository) {}

  async list(query: QueryTenantsDto): Promise<TenantListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await this.tenants.list({
      skip: (page - 1) * pageSize,
      take: pageSize,
      status: query.status,
      keyword: query.keyword,
    });

    return { items: rows.map(toTenantDto), total, page, pageSize };
  }

  async get(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) throw new NotFoundException("租户不存在");
    return toTenantDto(tenant);
  }

  async create(input: CreateTenantDto): Promise<TenantResponseDto> {
    const existing = await this.tenants.findBySlug(input.slug);
    if (existing) throw new ConflictException("slug 已存在");

    const tenant = await this.tenants.create({
      name: input.name,
      slug: input.slug,
    });
    return toTenantDto(tenant);
  }

  async update(
    id: string,
    input: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    // 旧值同时用于 404 判断与审计 before 快照
    const before = await this.get(id);
    AuditContext.setBefore(before);

    const tenant = await this.tenants.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
    return toTenantDto(tenant);
  }

  /** 只允许删空租户（无成员、无订阅）；有依赖时 409，停用走 PATCH status */
  async remove(id: string): Promise<void> {
    const before = await this.get(id);
    AuditContext.setBefore(before);

    const [members, subscriptions] = await Promise.all([
      this.tenants.countMembers(id),
      this.tenants.countSubscriptions(id),
    ]);

    if (members > 0 || subscriptions > 0) {
      throw new ConflictException(
        "租户仍有成员或订阅，不能删除；请先停用（status=suspended）",
      );
    }

    await this.tenants.softDelete(id);
  }
}
