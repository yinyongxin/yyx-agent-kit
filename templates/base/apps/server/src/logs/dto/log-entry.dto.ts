import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** 一条日志（从 Loki 行解析；raw 为完整 JSON，字段随日志类型变化） */
export class LogEntryDto {
  @ApiProperty({ example: "2026-11-28T04:06:37.190Z" })
  timestamp!: string;

  @ApiProperty({ example: "info" })
  level!: string;

  @ApiPropertyOptional({ example: "request completed" })
  message?: string;

  @ApiPropertyOptional({ example: "4bf92f3577b34da6a3ce929d0e0e4736" })
  traceId?: string;

  @ApiPropertyOptional()
  requestId?: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiPropertyOptional({ example: "GET" })
  method?: string;

  @ApiPropertyOptional({ example: "/api/tenants" })
  path?: string;

  @ApiPropertyOptional({ example: 200 })
  statusCode?: number;

  @ApiPropertyOptional({ example: 12, description: "响应耗时（ms）" })
  responseTime?: number;

  @ApiProperty({ type: Object, description: "完整日志行（已脱敏）" })
  raw!: Record<string, unknown>;
}

export class LogQueryResponseDto {
  @ApiProperty({ type: [LogEntryDto] })
  items!: LogEntryDto[];

  @ApiProperty({ description: "Loki 无总数；等于已取回条数（用于分页展示）" })
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty({ description: "当前时间窗口内是否还有更多（超出 page*pageSize）" })
  hasMore!: boolean;
}

export class LogLevelStatsDto {
  @ApiProperty({ type: [String] })
  levels!: string[];

  @ApiProperty({ type: [Number] })
  counts!: number[];

  @ApiProperty()
  total!: number;
}
