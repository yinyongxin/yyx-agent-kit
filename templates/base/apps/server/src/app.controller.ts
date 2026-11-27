import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@nestjs/authentication";
import { AppService } from "./app.service";
import { HealthDto } from "./dto/health.dto";
import { API_ROUTES, asRoute } from "../../../packages/shared/src/index";

const HEALTH_PATH = asRoute(API_ROUTES.health);

@ApiTags("health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** 运维探活：@Public() 豁免官方认证包的全局 guard */
  @ApiOperation({ summary: "健康检查（公开）" })
  @ApiOkResponse({ type: HealthDto })
  @Public()
  @Get(HEALTH_PATH)
  getHealth(): HealthDto {
    return this.appService.getHealth();
  }
}
