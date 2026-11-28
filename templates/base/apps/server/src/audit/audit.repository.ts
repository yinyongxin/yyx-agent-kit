import { Injectable } from "@nestjs/common";
import type { Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/prisma/prisma.service";

export interface AuditListParams {
  skip: number;
  take: number;
  action?: string;
  resource?: string;
  result?: "success" | "failure";
  actorUserId?: string;
  tenantId?: string;
  traceId?: string;
  keyword?: string;
  start?: Date;
  end?: Date;
}

/**
 * 审计日志查询（平台级）。
 *
 * audit_logs 启用了 RLS：普通连接只能看 app.tenant_id 对应租户。
 * 平台管理员查全量时，在事务内设置 `app.audit_scope='all'`（LOCAL，自动清理）。
 */
@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(params: AuditListParams) {
    const where = this.buildWhere(params);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.audit_scope', 'all', true)`;
      return Promise.all([
        tx.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: params.skip,
          take: params.take,
        }),
        tx.auditLog.count({ where }),
      ]);
    });
  }

  findById(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.audit_scope', 'all', true)`;
      return tx.auditLog.findUnique({ where: { id } });
    });
  }

  private buildWhere(params: AuditListParams): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) where.action = params.action;
    if (params.resource) where.resource = params.resource;
    if (params.result) where.result = params.result;
    if (params.actorUserId) where.actorUserId = params.actorUserId;
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.traceId) where.traceId = params.traceId;

    if (params.start || params.end) {
      where.createdAt = {
        ...(params.start ? { gte: params.start } : {}),
        ...(params.end ? { lte: params.end } : {}),
      };
    }

    if (params.keyword) {
      where.OR = [
        { summary: { contains: params.keyword, mode: "insensitive" } },
        { actorLabel: { contains: params.keyword, mode: "insensitive" } },
        { resourceId: { contains: params.keyword, mode: "insensitive" } },
        { action: { contains: params.keyword, mode: "insensitive" } },
        { resource: { contains: params.keyword, mode: "insensitive" } },
        // after 里的常见业务字段（租户名 / slug），用于按对象搜索
        { after: { path: ["name"], string_contains: params.keyword } },
        { after: { path: ["slug"], string_contains: params.keyword } },
      ];
    }

    return where;
  }
}
