import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load the monorepo-root .env into the Next runtime. Our convention (README,
// .env.example) keeps a single .env at the repo root, but Turbo and Next only
// auto-load app-local env files — so DATABASE_URL et al. never reached the
// server and the app silently ran in the in-memory fallback instead of the
// configured Supabase. loadEnvFile does NOT override vars already set by the
// platform/shell, so on Vercel (no committed .env; env comes from the platform)
// this is a guarded no-op and never clobbers NODE_ENV during a prod build.
const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
if (existsSync(rootEnv) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(rootEnv);
  } catch {
    // Malformed/unreadable .env — fall back to whatever env is already set.
  }
}

/** @type {import('next').NextConfig} */

// Baseline hardening headers. NOTE: Content-Security-Policy is intentionally NOT
// set here — it is owned by middleware.ts, which mints a per-request nonce and
// emits a strict, nonce-based `script-src` (no 'unsafe-inline') in production. A
// static CSP header cannot carry a per-request nonce and would only duplicate or
// conflict with the middleware one, so CSP lives there and the rest of the
// long-lived, request-independent security headers live here.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages ship raw TypeScript (main -> src/index.ts); Next must
  // transpile them rather than expecting pre-built dist output.
  transpilePackages: [
    "@helix/shared",
    "@helix/core",
    "@helix/payers",
    "@helix/llm",
    "@helix/agents",
    "@helix/db",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
