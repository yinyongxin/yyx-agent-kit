import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import {
  DEFAULT_DEMO_PASSWORD,
  seedDemoAccounts,
  type DemoSeedResult,
} from "./demo-seed";

/** 开发面板「重置演示账号」入口；与 CLI seed 共用同一份逻辑。 */
@Injectable()
export class DemoSeedService {
  private readonly password: string;
  private running: Promise<DemoSeedResult> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.password =
      config.get<string>("dev.demoUserPassword") ?? DEFAULT_DEMO_PASSWORD;
  }

  /** 同时点击多次时复用同一个任务，避免并发写角色/成员关系 */
  run(): Promise<DemoSeedResult> {
    if (this.running) return this.running;
    this.running = seedDemoAccounts(this.prisma, this.password).finally(() => {
      this.running = null;
    });
    return this.running;
  }
}
