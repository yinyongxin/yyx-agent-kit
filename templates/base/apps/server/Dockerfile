# 后端生产镜像（monorepo 根为构建上下文）
# 用法：docker build -f apps/server/Dockerfile -t starter-server .

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

# 构建阶段依赖（含 devDependencies，用于 prisma generate / tsc）
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/server apps/server
COPY packages packages
# prisma generate 只读 schema，占位 URL 避免配置校验失败
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter @starter/server prisma:generate \
 && pnpm --filter @starter/server build

# 生产依赖（只含 dependencies；prisma / pg / dotenv 已放 dependencies）
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --prod

FROM node:24-alpine AS runner
# Prisma schema engine 在 Alpine 需要 openssl / libc6-compat；dumb-init 处理信号
RUN apk add --no-cache dumb-init openssl libc6-compat

WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=prod-deps /app/packages/shared ./packages/shared

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
COPY --from=build /app/apps/server/prisma7.config.ts ./apps/server/
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY docker/server-entrypoint.sh /usr/local/bin/server-entrypoint.sh
RUN chmod +x /usr/local/bin/server-entrypoint.sh \
 && addgroup -S app && adduser -S app -G app \
 && chown -R app:app /app

USER app
EXPOSE 47100

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:47100/api/health >/dev/null || exit 1

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/server-entrypoint.sh"]
CMD ["node", "apps/server/dist/apps/server/src/main.js"]
