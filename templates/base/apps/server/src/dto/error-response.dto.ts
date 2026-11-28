import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** 统一错误响应（由全局异常过滤器/HttpException 输出） */
export class ErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: "Unauthorized" })
  message!: string | string[];

  @ApiPropertyOptional({ example: "missing_credentials" })
  errorCode?: string;

  /** 请求 trace id，用户在页面上看到后可直接提供给支持排查 */
  @ApiPropertyOptional({ example: "4bf92f3577b34da6a3ce929d0e0e4736" })
  traceId?: string;
}
