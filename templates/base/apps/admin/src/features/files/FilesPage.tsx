import { PageShell } from "@/components/PageShell";
import { PermissionGate } from "@/components/Permission";
import { PERMISSIONS } from "@starter/shared";
import { FilesContent } from "./FilesContent";

/** 文件管理页：页面壳 + 租户权限门禁 */
export const FilesPage = () => (
  <PageShell title="文件" description="上传、下载与管理当前租户的文件">
    <PermissionGate permission={PERMISSIONS.fileRead}>
      <FilesContent />
    </PermissionGate>
  </PageShell>
);
