-- files 是租户业务表：与应用日志/权限相同的 RLS 隔离。
-- 未设置 app.tenant_id 时 NULLIF 得到 NULL，比较非真 → fail-closed。
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "files" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "files"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
