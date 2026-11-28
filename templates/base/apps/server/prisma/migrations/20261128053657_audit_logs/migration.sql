-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('success', 'failure');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "actorUserId" UUID,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "result" "AuditResult" NOT NULL DEFAULT 'success',
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_traceId_idx" ON "audit_logs"("traceId");

-- audit_logs：append-only + 租户隔离
-- SELECT：本租户（app.tenant_id），或平台管理员（app.audit_scope = 'all'）
-- INSERT：允许（应用负责写正确的 tenantId；写入用 createMany 避免 RETURNING 受 SELECT policy 影响）
-- UPDATE / DELETE：不创建 policy → FORCE RLS 下全部拒绝，保证不可篡改
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON "audit_logs"
  FOR SELECT
  USING (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.audit_scope', true) = 'all'
  );

CREATE POLICY audit_logs_insert ON "audit_logs"
  FOR INSERT
  WITH CHECK (true);

