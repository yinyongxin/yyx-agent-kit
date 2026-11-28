import { Module } from "@nestjs/common";
import { TenancyCoreModule } from "../tenancy/tenancy-core.module";
import { TenantFilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { FilesRepository } from "./repositories/files.repository";
import { LocalFileStorage } from "./storage/local-file.storage";
import { FILE_STORAGE } from "./storage/file-storage";

/** 租户文件（`/t/:tenantId/files`）：元数据 + 内容存储 */
@Module({
  imports: [TenancyCoreModule],
  controllers: [TenantFilesController],
  providers: [
    FilesService,
    FilesRepository,
    { provide: FILE_STORAGE, useClass: LocalFileStorage },
  ],
  exports: [FilesService],
})
export class FilesModule {}
