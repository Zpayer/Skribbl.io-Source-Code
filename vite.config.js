import { defineConfig } from "vite";

export default defineConfig({
  // Static assets (img/, css/, audio/, favicon.png) live in public/ and are
  // copied verbatim into dist/ on build.
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      // The game asks the express server where to connect:
      //   POST /api/play -> ws://localhost:5002/
      // During `vite dev` the express server runs separately on :5003.
      "/api": {
        target: "http://localhost:5003",
        changeOrigin: true,
      },
    },
  },
});
