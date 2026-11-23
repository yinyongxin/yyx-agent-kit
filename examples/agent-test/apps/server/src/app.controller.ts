import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { API_ROUTES } from "../../../packages/shared/src/index";

const HEALTH_PATH = API_ROUTES.health.replace(/^\//, "");

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(HEALTH_PATH)
  getHealth() {
    return this.appService.getHealth();
  }
}
