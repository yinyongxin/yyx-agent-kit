# 后端镜像（monorepo 根为构建上下文）
# 用法：docker build -f apps/server/Dockerfile -t starter-server .
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

# 依赖层：先只拷贝清单，利用缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --ignore-scripts

# 源码层
COPY tsconfig.base.json ./
COPY apps/server apps/server
COPY packages packages

# 构建（根目录统一 build，避免嵌套 pnpm 调用）
RUN pnpm --filter @starter/server build

# 运行
ENV NODE_ENV=production
EXPOSE 47100
CMD ["node", "apps/server/dist/main.js"]
