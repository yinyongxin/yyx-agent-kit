import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:47100";

const nextConfig: NextConfig = {
  // packages 以 TS 源码形式被消费，需要 Next 转译
  transpilePackages: ["@starter/shared", "@starter/api"],
  async rewrites() {
    // 与 client / admin 一致：前端统一走 /api，不写死后端域名
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
