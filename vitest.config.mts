import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const environmentOnlyShim = fileURLToPath(
  new URL("./tests/shims/environment-only.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "client-only": environmentOnlyShim,
      "server-only": environmentOnlyShim,
    },
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    exclude: ["tests/browser/**", "tests/quality/**", "node_modules/**"],
    setupFiles: ["./tests/setup.ts"],
  },
});
