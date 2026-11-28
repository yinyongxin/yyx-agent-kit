import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "@nestjs/authentication";
import { API_ROUTES, asRoute } from "../shared";
import { RateLimit } from "../common/decorators/rate-limit.decorator";
import { DevService, type DevServiceInfo } from "./dev.service";
import { DemoSeedService } from "./demo-seed.service";
import type { DemoSeedResult } from "./demo-seed";
import { renderDevPage } from "./dev.page";

export interface DevServicesResponse {
  checkedAt: string;
  services: DevServiceInfo[];
}

/**
 * 本地开发导航页。
 *
 * - `GET /starter/api/dev`          网页（每 5 秒轮询一次）
 * - `GET /starter/api/dev/services` 探测结果 JSON
 * - `POST /starter/api/dev/seed-demo` 重置本地演示账号
 *
 * 只由 DevModule 在非生产环境注册；这里再兜一层，避免误配把开发信息暴露到生产。
 * `@Public()`：页面需要在未登录时也能打开（不带头部 token）。
 */
@ApiExcludeController()
@Controller()
export class DevController {
  constructor(
    private readonly devService: DevService,
    private readonly demoSeed: DemoSeedService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get(asRoute(API_ROUTES.dev))
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "no-store")
  page(): string {
    this.assertDev();
    return renderDevPage();
  }

  @Public()
  @Get(asRoute(API_ROUTES.devServices))
  async services(): Promise<DevServicesResponse> {
    this.assertDev();
    try {
      return {
        checkedAt: new Date().toISOString(),
        services: await this.devService.getServices(),
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : "开发服务探测失败",
      );
    }
  }

  /** 重置本地演示账号；仅开发环境，10 秒内最多一次 */
  @Public()
  @Post(asRoute(API_ROUTES.devSeedDemo))
  @RateLimit({ limit: 1, windowSeconds: 10 })
  seedDemo(): Promise<DemoSeedResult> {
    this.assertDev();
    return this.demoSeed.run();
  }

  /** 全局限流验收探针：3 次/分钟，仅开发环境注册 */
  @Public()
  @Get(asRoute(API_ROUTES.devRateLimitProbe))
  @RateLimit({ limit: 3, windowSeconds: 60 })
  rateLimitProbe(): { ok: true } {
    this.assertDev();
    return { ok: true };
  }

  private assertDev() {
    if (this.config.getOrThrow<string>("app.nodeEnv") === "production") {
      throw new NotFoundException();
    }
  }
}
