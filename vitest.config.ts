import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["node_modules", "e2e"],
    coverage: {
      provider: "v8",
      // Focus the report on the code that carries logic. UI primitives, types,
      // generated schema, and one-off seed/scrape scripts are excluded so the
      // numbers track the surface where a regression actually bites.
      include: ["src/lib/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}"],
      exclude: [
        "**/__tests__/**",
        "**/*.d.ts",
        "src/lib/db/schema*.ts",
        "src/lib/db/relations.ts",
        "src/lib/db/seed*.ts",
        "src/lib/db/migrate.ts",
        "src/lib/**/types.ts",
        "src/lib/supabase/**",
      ],
      reporter: ["text-summary", "html"],
    },
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
