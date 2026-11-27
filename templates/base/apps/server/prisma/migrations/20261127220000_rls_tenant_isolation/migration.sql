-- RLS 兜底：租户表（带 tenantId 的业务表）。
-- 不启用：UserTenant（guard 查「当前租户」的入口，鸡生蛋）、UserRole / RolePermission /
-- OAuthConnection（无 tenantId 列，靠父表间接保护）、Tenant / User / Permission / Plan / PlatformAdmin（全局表）。
--
-- 与 RLS 技术方案的偏差：模板应用连接用户即表 owner，只 ENABLE 不 FORCE 时 owner 会绕过
-- policy（形同虚设），故 ENABLE 与 FORCE 在同一迁移里落地；应用侧已在 S1 用
-- TenantTransactionInterceptor 设置事务级 app.tenant_id，seed 也设置 session 级变量。

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "roles"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subscriptions"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);
