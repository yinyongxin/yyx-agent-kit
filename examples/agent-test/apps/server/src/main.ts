import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { API_PREFIX } from "../../../packages/shared/src/index";

// 本地固定 47100；部署环境可由 PORT 覆盖（生产前端同源部署，不走 Vite 代理）
const port = Number(process.env.PORT ?? 47100);

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ""));
  await app.listen(port);
};

bootstrap();
