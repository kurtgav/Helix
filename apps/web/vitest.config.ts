import { defineConfig } from "vitest/config";

// Pure-logic smoke tests only (helpers/formatters). Component/e2e coverage is
// handled by Playwright (see e2e/) so vitest stays dependency-light.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
