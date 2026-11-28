# portal 生产镜像（monorepo 根为构建上下文）
# 用法：docker build -f apps/portal/Dockerfile -t starter-portal .

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/portal/package.json apps/portal/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/portal apps/portal
COPY packages packages
RUN pnpm --filter @starter/api openapi-ts \
 && pnpm --filter @starter/portal build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/portal ./apps/portal
COPY --from=build /app/packages ./packages
COPY --from=build /app/dist/portal ./dist/portal
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Next 产物在根 dist/portal，运行时从产物路径向上找 node_modules；
# 链接到 apps/portal/node_modules，避免 Cannot find module 'next/...'
RUN ln -sfn /app/apps/portal/node_modules /app/dist/portal/node_modules

WORKDIR /app/apps/portal
EXPOSE 47175
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "47175"]
