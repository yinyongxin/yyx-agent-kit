import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Can } from "@nestjs/authorization";
import { API_ROUTES, asRoute } from "../shared";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { AuditQueryService } from "./audit-query.service";
import { AuditLogDto, AuditLogListResponseDto } from "./dto/audit-log.dto";
import { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";

/**
 * 审计日志查询（平台管理员）。
 *
 * 审计表是 append-only 的：这里只暴露读接口，不提供修改 / 删除。
 * 租户内查看走 TenantTx（RLS 自动按 app.tenant_id 过滤），平台查看用 app.audit_scope='all'。
 */
@ApiTags("audit-logs")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@UseGuards(PlatformAdminGuard)
@Controller(asRoute(API_ROUTES.auditLogs))
export class AuditController {
  constructor(private readonly audit: AuditQueryService) {}

  @ApiOperation({ summary: "审计日志列表（动作 / 资源 / 结果 / 操作者 / 租户 / traceId）" })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  @Get()
  @Can.Anyone()
  list(@Query() query: QueryAuditLogsDto): Promise<AuditLogListResponseDto> {
    return this.audit.list(query);
  }

  @ApiOperation({ summary: "审计日志详情（含 before / after）" })
  @ApiOkResponse({ type: AuditLogDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(":id")
  @Can.Anyone()
  get(@Param("id", ParseUUIDPipe) id: string): Promise<AuditLogDto> {
    return this.audit.get(id);
  }
}
