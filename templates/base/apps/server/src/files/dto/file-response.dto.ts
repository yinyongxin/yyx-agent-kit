import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FileResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ description: "原始文件名", example: "合同.pdf" })
  name!: string;

  @ApiProperty({ example: "application/pdf" })
  mimeType!: string;

  @ApiProperty({ description: "字节数", example: 102400 })
  size!: number;

  @ApiPropertyOptional({ type: String, description: "SHA-256", nullable: true })
  checksum!: string | null;

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  uploadedById!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  uploadedByName!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class FileListResponseDto {
  @ApiProperty({ type: [FileResponseDto] })
  items!: FileResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
