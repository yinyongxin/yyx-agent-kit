import type { NextConfig } from "next";
import { API_PREFIX } from "@starter/shared";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:47100";

const nextConfig: NextConfig = {
  // 统一输出到项目根 dist/portal（Next 默认 .next，改目录避免多 app 混淆）
  distDir: "../../dist/portal",
  // packages 以 TS 源码形式被消费，需要 Next 转译
  transpilePackages: ["@starter/shared", "@starter/api"],
  // Tailwind v4 在 Turbopack 下需要显式注册 loader；同时禁用构建 FS 缓存，
  // 规避暖构建复用旧 CSS compiler 导致样式不更新的问题（Next issue #100326）
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    turbopackFileSystemCacheForBuild: false,
  },
  // 低内存环境下 prerender 阶段默认生成 source map 会让 build worker OOM，
  // 官网内存优化指南推荐关掉；portal 只有少量静态页，关闭无实质影响
  enablePrerenderSourceMaps: false,
  // 根 pnpm build 已包含全量 pnpm typecheck，Next 内置 typecheck 是重复劳动；
  // 低内存环境下 typescript-go 解析 .d.ts 会 OOM，关掉不影响类型安全（由根 typecheck 兜底）
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // 与 client / admin 一致：前端统一走 /api，不写死后端域名
    return [
      {
        source: `${API_PREFIX}/:path*`,
        destination: `${apiOrigin}${API_PREFIX}/:path*`,
      },
    ];
  },
};

export default nextConfig;
