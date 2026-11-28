import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { from, throwError, type Observable } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";
import type { TracedRequest } from "../logging/trace.middleware";
import { AuditContext } from "./audit-context";
import { AUDIT_OPTIONS, type AuditOptions } from "./audit.decorator";
import { AuditService } from "./audit.service";

/**
 * 审计拦截器（全局）：
 * - 只处理带 `@Audit()` 的 handler
 * - 成功：写 result=success，after=返回值（可用 recordResult:false 关闭）
 * - 失败：写 result=failure，summary=error.message，然后把原异常抛回
 *
 * 写入是 await 的（一次 INSERT），保证响应返回时审计已落库；
 * AuditService 内部已 try/catch，不会因为审计失败让业务失败。
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const options = this.reflector.get<AuditOptions>(
      AUDIT_OPTIONS,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest<TracedRequest>();
    const tenantId = req.params?.tenantId ?? req.tenantId ?? null;
    const actorUserId = req.user?.id ?? null;

    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        await this.audit.record({
          ...options,
          tenantId,
          actorUserId,
          resourceId: this.resolveResourceId(options, data, req),
          before: AuditContext.getBefore(),
          after: options.recordResult === false ? undefined : data,
        });
        return data;
      }),
      catchError((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        return from(
          this.audit.record({
            ...options,
            tenantId,
            actorUserId,
            resourceId: this.resolveResourceId(options, undefined, req),
            result: "failure",
            summary: options.summary ?? message,
            before: AuditContext.getBefore(),
          }),
        ).pipe(mergeMap(() => throwError(() => error)));
      }),
    );
  }

  private resolveResourceId(
    options: AuditOptions,
    data: unknown,
    req: TracedRequest,
  ): string | null {
    if (options.resourceId) return options.resourceId(data, req) ?? null;

    const fromData = (data as { id?: unknown } | undefined)?.id;
    if (typeof fromData === "string") return fromData;

    const fromParams = (req.params as { id?: string } | undefined)?.id;
    return fromParams ?? null;
  }
}
