import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    // 官网要求：tanstackRouter 必须在 @vitejs/plugin-react 之前
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  server: {
    // 47xxx 段，避开 5173 等框架默认端口
    port: 47174,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:47100",
    },
  },
});
