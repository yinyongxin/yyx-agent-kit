# client 生产镜像（monorepo 根为构建上下文）
# 用法：docker build -f apps/client/Dockerfile -t starter-client .

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/client apps/client
COPY packages packages
RUN pnpm --filter @starter/api openapi-ts \
 && pnpm --filter @starter/client build

FROM nginx:alpine AS runner
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/client /usr/share/nginx/html
EXPOSE 80
