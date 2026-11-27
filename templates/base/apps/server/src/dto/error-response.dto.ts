import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** 统一错误响应（由全局异常过滤器/HttpException 输出） */
export class ErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: "Unauthorized" })
  message!: string | string[];

  @ApiPropertyOptional({ example: "missing_credentials" })
  errorCode?: string;
}
