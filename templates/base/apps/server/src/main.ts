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
