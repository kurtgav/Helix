import { defineConfig } from "vitest/config";

// `server-only` / `client-only` are build-time guard packages. Next.js injects a
// bundler alias so `import "server-only"` resolves to an empty module inside a
// Server Component (and throws if a Client Component imports it) — there is no
// top-level package on disk. Vitest's plain Node resolver therefore cannot load a
// server-only module like lib/auth.ts at all. This tiny virtual-module plugin
// reproduces Next's server-side behavior for tests — it maps the guard imports to
// an empty module so we can unit-test the PURE logic they co-locate (resolveRole,
// the RBAC mapping). It changes nothing about the guard in a real Next build.
const stubServerGuards = {
  name: "helix-stub-server-guards",
  enforce: "pre" as const,
  resolveId(id: string): string | null {
    return id === "server-only" || id === "client-only" ? `\0${id}` : null;
  },
  load(id: string): string | null {
    return id === "\0server-only" || id === "\0client-only" ? "export {};" : null;
  },
};

// Pure-logic smoke tests only (helpers/formatters/auth/rate-limit). Component/e2e
// coverage is handled by Playwright (see e2e/) so vitest stays dependency-light.
export default defineConfig({
  plugins: [stubServerGuards],
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
