-- 软删除租户统一置为 suspended，避免只靠 deletedAt 拦截。
-- 历史数据：此前 softDelete 只写 deletedAt，status 仍可能是 active。
UPDATE "tenants"
SET "status" = 'suspended'
WHERE "deletedAt" IS NOT NULL
  AND "status" <> 'suspended';
