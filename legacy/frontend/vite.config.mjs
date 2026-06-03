import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Cigs keeps JSX inside .js files (a CRA-ism). Vite's esbuild transform
// defaults to treating .js as plain JS, so JSX fails to parse during the
// production build. Tell esbuild to load every .js under src as JSX — this
// applies to both the dev transform and the prod build. optimizeDeps covers
// the dep pre-bundler. The "@" alias mirrors the old craco/jsconfig setup.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
});
