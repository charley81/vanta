import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    exclude: ["tests/browser/**", "node_modules/**"],
    setupFiles: ["./tests/setup.ts"],
  },
});
