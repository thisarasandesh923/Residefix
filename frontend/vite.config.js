import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev` the browser calls /api on the Vite server, which forwards
// it to the backend. Override the target with VITE_PROXY_TARGET if needed.
const apiTarget = process.env.VITE_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: true, // also reachable from other devices on the network
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
