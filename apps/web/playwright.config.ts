import { defineConfig, devices } from "@playwright/test";

// Happy-path e2e config. Requires @playwright/test (add as a dev dependency and
// run `pnpm exec playwright install`). Boots the dev server, drives the flow at
// desktop + mobile widths. Kept minimal for the v0 slice.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
