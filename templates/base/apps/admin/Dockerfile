# admin 生产镜像（monorepo 根为构建上下文）
# 用法：docker build -f apps/admin/Dockerfile -t starter-admin .

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/admin apps/admin
COPY packages packages
# 只用已提交的 openapi.json 生成客户端，不依赖数据库
RUN pnpm --filter @starter/api openapi-ts \
 && pnpm --filter @starter/admin build

FROM nginx:alpine AS runner
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/admin /usr/share/nginx/html
EXPOSE 80
