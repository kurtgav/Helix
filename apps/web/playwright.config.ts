import { defineConfig, devices } from "@playwright/test";

// Helix e2e configuration.
//
// The suite runs against a PRODUCTION build (`next build` + `next start`), not
// `next dev`. That is deliberate: the app's security posture (the strict
// per-request-nonce CSP in middleware.ts, the static "/" vs. dynamic-app split)
// and its real bundle only exist in a prod build, so exercising `next dev` would
// test a different application than the one that ships.
//
// Configuration knobs (all optional):
//   • PLAYWRIGHT_PORT      — port to build+serve on (default 3100, kept off 3000
//                            so a running `pnpm dev` is never clobbered).
//   • PLAYWRIGHT_BASE_URL  — point the suite at an ALREADY-running server; when
//                            set, no server is spawned and no build runs. Use
//                            this in CI after a separate build step, or to iterate
//                            against a warm server.
//
// If you prefer to build yourself first: run `pnpm --filter web build` then
// `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm --filter web exec playwright test`.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const HOST = "127.0.0.1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;

// When an external server URL is provided, don't manage a server ourselves.
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  // Per-test cap. The webServer build gets its own, larger budget below.
  timeout: 30_000,
  // Web-first assertions retry up to this long — generous enough for a cold
  // prod server without resorting to arbitrary sleeps.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // One worker on CI for a stable single-instance backend (the in-memory audit /
  // parked-encounter state and the fixed-window rate limiter are process-global);
  // local runs parallelize freely.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Run the suite in the app's reduced-motion mode (a first-class product
    // path: globals.css swaps scroll-behavior to auto and zeroes transitions).
    // Without this, `html { scroll-behavior: smooth }` makes every
    // scroll-into-view glide, and clicks deep in long pages (mobile /ledger)
    // land mid-animation on whatever drifts past — a whole class of flake.
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: useExternalServer
    ? undefined
    : {
        // Build then serve the production bundle. `next start` requires a prior
        // build, so we chain them; DATABASE_URL="" pins the app to its
        // deterministic in-memory (mock) backend so e2e never depends on a live
        // Supabase being reachable. next.config's loadEnvFile does not override an
        // already-set var, so this wins over any repo-root .env.
        command: `pnpm exec next build && pnpm exec next start --hostname ${HOST} --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          DATABASE_URL: "",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
});
