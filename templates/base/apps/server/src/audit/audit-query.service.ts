import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuditLog } from "@/generated/prisma/client";
import { AuditRepository } from "./audit.repository";
import type { AuditLogDto, AuditLogListResponseDto } from "./dto/audit-log.dto";
import type { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";

const toDto = (row: AuditLog): AuditLogDto => ({
  id: row.id,
  tenantId: row.tenantId,
  actorUserId: row.actorUserId,
  actorLabel: row.actorLabel,
  action: row.action,
  resource: row.resource,
  resourceId: row.resourceId,
  result: row.result,
  summary: row.summary,
  before: (row.before as Record<string, unknown> | null) ?? null,
  after: (row.after as Record<string, unknown> | null) ?? null,
  ip: row.ip,
  userAgent: row.userAgent,
  traceId: row.traceId,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class AuditQueryService {
  constructor(private readonly audit: AuditRepository) {}

  async list(query: QueryAuditLogsDto): Promise<AuditLogListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await this.audit.list({
      skip: (page - 1) * pageSize,
      take: pageSize,
      action: query.action,
      resource: query.resource,
      result: query.result,
      actorUserId: query.actorUserId,
      tenantId: query.tenantId,
      traceId: query.traceId,
      keyword: query.keyword,
      start: query.start ? new Date(query.start) : undefined,
      end: query.end ? new Date(query.end) : undefined,
    });

    return { items: rows.map(toDto), total, page, pageSize };
  }

  async get(id: string): Promise<AuditLogDto> {
    const row = await this.audit.findById(id);
    if (!row) throw new NotFoundException("审计记录不存在");
    return toDto(row);
  }
}
