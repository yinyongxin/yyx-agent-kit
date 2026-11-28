import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Can } from "@nestjs/authorization";
import { API_ROUTES, asRoute } from "@/shared";
import { PlatformAdminGuard } from "@/auth/guards/platform-admin.guard";
import { ErrorResponseDto } from "@/dto/error-response.dto";
import {
  LogEntryDto,
  LogLevelStatsDto,
  LogQueryResponseDto,
} from "./dto/log-entry.dto";
import { LOG_RANGES, QueryLogsDto, type LogRange } from "./dto/query-logs.dto";
import { LogsService } from "./logs.service";

/**
 * 平台日志查询（Loki）。
 *
 * 只给平台管理员：普通租户成员不应看到全平台请求日志。
 * 日志来自 Loki（stdout → Alloy → Loki），不读业务库。
 */
@ApiTags("logs")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiServiceUnavailableResponse({ type: ErrorResponseDto })
@ApiBadGatewayResponse({ type: ErrorResponseDto })
@UseGuards(PlatformAdminGuard)
@Controller(asRoute(API_ROUTES.logs))
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @ApiOperation({ summary: "日志检索（时间范围 / 级别 / traceId / userId / tenantId / 路径）" })
  @ApiOkResponse({ type: LogQueryResponseDto })
  @Get()
  @Can.Anyone()
  list(@Query() query: QueryLogsDto): Promise<LogQueryResponseDto> {
    return this.logs.query(query);
  }

  @ApiOperation({ summary: "按级别统计窗口内日志条数" })
  @ApiOkResponse({ type: LogLevelStatsDto })
  @Get("stats")
  @Can.Anyone()
  stats(@Query("range") range?: string): Promise<LogLevelStatsDto> {
    const parsed = LOG_RANGES.includes(range as LogRange)
      ? (range as LogRange)
      : "15m";
    return this.logs.stats(parsed);
  }

  @ApiOperation({ summary: "同一 traceId 的完整时间线（近 24h，升序）" })
  @ApiOkResponse({ type: [LogEntryDto] })
  @Get("trace/:traceId")
  @Can.Anyone()
  trace(@Param("traceId") traceId: string): Promise<LogEntryDto[]> {
    if (!/^[0-9a-f]{32}$/i.test(traceId)) {
      throw new BadRequestException("traceId 必须是 32 位十六进制");
    }
    return this.logs.trace(traceId.toLowerCase());
  }
}
