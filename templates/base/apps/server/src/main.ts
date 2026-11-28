import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// 必须在 import AppModule 之前加载 .env：JwtStrategy / prisma 在模块加载时就读 process.env
// 从 cwd 向上找最近的 .env（兼容源码/编译产物不同目录层级）
const findEnv = () => {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, "..");
  }
  return undefined;
};
const envPath = findEnv();
if (envPath) config({ path: envPath });

import "reflect-metadata";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node";
import { SwaggerModule } from "@nestjs/swagger";
import { Logger as PinoLogger, LoggerErrorInterceptor } from "nestjs-pino";
import { AppModule } from "./app.module";
import { buildOpenApiDocument } from "./swagger";
import { API_PREFIX } from "../../../packages/shared/src/index";

const bootstrap = async () => {
  // NestJS 12.3+ 推荐 NodeAdapter（v13 起为默认）：直接跑在 node:http 上，
  // req/res 带 Express 风格 helpers，现有 middleware 写法不变
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter(),
    { bufferLogs: true },
  );
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>("app.port");
  app.useLogger(app.get(PinoLogger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ""));
  // DTO 校验：白名单丢弃未声明字段，transform 把 body 转成 DTO 实例
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger UI 与 OpenAPI JSON（生成前端客户端的契约源）。
  // 默认开发开、生产关；生产确实需要时用 SWAGGER_ENABLED=true 显式开启。
  if (config.getOrThrow<boolean>("app.swaggerEnabled")) {
    const document = buildOpenApiDocument(app);
    SwaggerModule.setup("api/docs", app, document, {
      jsonDocumentUrl: "api/docs-json",
    });
  }

  await app.listen(port);

  if (config.getOrThrow<string>("app.nodeEnv") !== "production") {
    Logger.log(`开发导航页：http://localhost:${port}/api/dev`, "Bootstrap");
  }
};

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
