import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Docker serves the app from the root; GitHub Pages serves it from /residefix-docker/.
  base: process.env.DOCKER_APP === "true" ? "/" : "/residefix-docker/",
});
