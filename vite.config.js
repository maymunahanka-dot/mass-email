import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
  resolve: {
    alias: {
      raf: path.resolve("src/shims/raf.js"),
      rgbcolor: path.resolve("node_modules/rgbcolor/index.js"),
    },
  },
});
