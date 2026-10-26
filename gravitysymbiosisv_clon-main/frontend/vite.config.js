/// <reference types="vitest" />
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  envDir: path.resolve(__dirname, ".."),
  envPrefix: ["VITE_", "SUPABASE_"],
  plugins: [
    checker({
      typescript: {
        tsconfigPath: "./tsconfig.json",
      },
      eslint: {
        lintCommand: "eslint src/",
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{js,ts}"],
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        timeout: 600000,
        proxyTimeout: 600000,
      },
    },
  },
});
