#!/bin/sh
set -eu

# 生产启动前执行迁移：容器失败退出，避免带旧 schema 提供服务。
# Prisma 7 的配置在 apps/server/prisma7.config.ts，优先读 MIGRATE_DATABASE_URL（superuser）。
echo "[entrypoint] prisma migrate deploy"
cd /app/apps/server
node_modules/.bin/prisma migrate deploy

# 首次部署可设 SEED_ON_START=true 初始化默认租户/权限/示例用户（seed 幂等）
if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] seed"
  node dist/apps/server/prisma/seed.js
fi

cd /app

exec "$@"
