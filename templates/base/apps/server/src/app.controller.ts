import { Controller, Get } from "@nestjs/common";
import { Public } from "@nestjs/authentication";
import { AppService } from "./app.service";
import { API_ROUTES } from "../../../packages/shared/src/index";

const HEALTH_PATH = API_ROUTES.health.replace(/^\//, "");

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** 运维探活：@Public() 豁免官方认证包的全局 guard */
  @Public()
  @Get(HEALTH_PATH)
  getHealth() {
    return this.appService.getHealth();
  }
}
