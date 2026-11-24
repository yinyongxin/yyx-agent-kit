import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // @ 别名指向 src，与 tsconfig paths 一致（Vite 8 官方推荐双配置）
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    // 47xxx 段，避开 5173 等框架默认端口
    port: 47173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:47100",
    },
  },
});
