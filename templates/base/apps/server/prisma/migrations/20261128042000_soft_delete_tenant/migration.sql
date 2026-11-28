-- DropIndex
DROP INDEX "tenants_slug_key";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug") WHERE ("deletedAt" IS NULL);
