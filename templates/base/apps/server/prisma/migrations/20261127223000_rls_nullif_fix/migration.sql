-- 修正：RESET app.tenant_id 后 current_setting('app.tenant_id', true) 返回空字符串
-- 而非 NULL，直接 ::uuid 会抛 "invalid input syntax for type uuid"。
-- NULLIF(...,'') 让未设置时得到 NULL → 比较结果为 NULL（非真）→ fail-closed 拒绝所有行。
DROP POLICY IF EXISTS tenant_isolation ON "roles";
CREATE POLICY tenant_isolation ON "roles"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON "subscriptions";
CREATE POLICY tenant_isolation ON "subscriptions"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
