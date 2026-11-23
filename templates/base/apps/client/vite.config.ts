import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
