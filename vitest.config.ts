import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["node_modules", "e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only / client-only are marker packages whose entry point flips
      // on the `react-server` export condition. Vitest doesn't set that
      // condition, so `server-only` would resolve to its throwing entry point
      // and break any suite that loads a server module. Alias both to the
      // no-op stub shipped in each package. client-only's default entry is
      // already the no-op, but we alias it explicitly so the two stay
      // symmetric and a future `resolve.conditions` change can't silently flip
      // it to its throwing build.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
      "client-only": path.resolve(__dirname, "./node_modules/client-only/index.js"),
    },
  },
});
