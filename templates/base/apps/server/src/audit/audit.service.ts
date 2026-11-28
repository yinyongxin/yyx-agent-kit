import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { RequestContext } from "../logging/request-context";
import { truncateForLog } from "../logging/sanitize";
import { PrismaService } from "../prisma/prisma.service";

export type AuditResult = "success" | "failure";

export interface AuditRecordInput {
  action: string;
  resource: string;
  resourceId?: string | null;
  tenantId?: string | null;
  actorUserId?: string | null;
  /** 登录失败时记录尝试的邮箱等标识 */
  actorLabel?: string | null;
  result?: AuditResult;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
}

const MAX_JSON_BYTES = 16_384;
const MAX_SUMMARY = 500;
const MAX_USER_AGENT = 500;

/** JSON 字段只接受可序列化值；复用日志脱敏与截断，避免 before/after 带出密码/token */
const toJson = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) return undefined;
  const sanitized = truncateForLog(value, MAX_JSON_BYTES);
  if (sanitized === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(sanitized)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
};

/**
 * 审计日志写入。
 *
 * - append-only：只 insert，不 update / delete（数据库 RLS 也禁止）
 * - 写入失败只 warn，不影响业务响应；后续可加补偿队列
 * - traceId / ip / userAgent 自动从 RequestContext 取
 * - 用 createMany 避免 `INSERT ... RETURNING` 受 SELECT policy 影响
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    const ctx = RequestContext.get();

    try {
      await this.prisma.auditLog.createMany({
        data: [
          {
            tenantId: input.tenantId ?? null,
            actorUserId: input.actorUserId ?? null,
            actorLabel: input.actorLabel ?? null,
            action: input.action,
            resource: input.resource,
            resourceId: input.resourceId ?? null,
            result: input.result ?? "success",
            summary: input.summary ? input.summary.slice(0, MAX_SUMMARY) : null,
            before: toJson(input.before),
            after: toJson(input.after),
            ip: ctx?.ip ?? null,
            userAgent: ctx?.userAgent ? ctx.userAgent.slice(0, MAX_USER_AGENT) : null,
            traceId: ctx?.traceId ?? null,
          },
        ],
      });
    } catch (error) {
      // 审计不能阻断业务；失败留应用日志，便于人工补录
      this.logger.warn(
        `审计写入失败（${input.action} ${input.result ?? "success"}）：${(error as Error).message}`,
      );
    }
  }
}
