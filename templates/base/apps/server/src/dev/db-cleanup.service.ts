import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import {
  countAuditLogs,
  createAuditAdminClient,
  deleteTestTenants,
  findTestTenants,
  purgeAuditLogs,
  type TestTenant,
} from "./db-cleanup";

export type CleanupAction = "preview" | "test-tenants" | "audit-logs";

export interface CleanupResult {
  action: CleanupAction;
  tenants: { id: string; name: string; slug: string; deletedAt: string | null }[];
  auditLogs: number;
  removedTenants: number;
  purgedAuditLogs: number;
}

/** 开发面板数据库维护：预览/清理测试租户、清空审计日志。 */
@Injectable()
export class DbCleanupService {
  private readonly migrateUrl: string;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.migrateUrl = config.get<string>("database.migrateUrl") ?? "";
  }

  async run(action: CleanupAction): Promise<CleanupResult> {
    if (this.running) {
      throw new ConflictException("已有清理任务在执行，请稍后再试");
    }
    if (!this.migrateUrl) {
      throw new ServiceUnavailableException(
        "需要配置 MIGRATE_DATABASE_URL 才能统计/清空 audit_logs",
      );
    }

    this.running = true;
    const admin = createAuditAdminClient(this.migrateUrl);
    try {
      const tenants = await findTestTenants(this.prisma);
      const auditLogs = await countAuditLogs(admin);

      let removedTenants = 0;
      let purgedAuditLogs = 0;

      if (action === "test-tenants") {
        removedTenants = await deleteTestTenants(this.prisma, tenants);
      } else if (action === "audit-logs") {
        purgedAuditLogs = await purgeAuditLogs(admin);
      } else if (action !== "preview") {
        throw new BadRequestException(`未知清理动作：${String(action)}`);
      }

      return {
        action,
        tenants: tenants.map((tenant: TestTenant) => ({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          deletedAt: tenant.deletedAt?.toISOString() ?? null,
        })),
        auditLogs,
        removedTenants,
        purgedAuditLogs,
      };
    } finally {
      await admin.$disconnect();
      this.running = false;
    }
  }
}
