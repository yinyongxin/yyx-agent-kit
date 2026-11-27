import type { INestApplication } from "@nestjs/common";
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger";

/**
 * 构建 OpenAPI 文档。
 * main.ts（在线 UI）与 scripts/export-openapi.ts（离线 JSON）共用，避免两处漂移。
 */
export const buildOpenApiDocument = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle("starter API")
    .setDescription("starter 模板后端接口（Bearer JWT，多租户路由 /api/t/:tenantId/...）")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
};
