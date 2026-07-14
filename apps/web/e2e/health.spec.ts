import { test, expect } from "@playwright/test";

// GET /api/health — the liveness/readiness probe. Must be a cheap, PHI-free,
// secret-free 200 with a stable JSON shape so uptime checks and the deploy
// pipeline can gate on it. `mode` reports whether a database is configured
// ("persistent") or the app is on its in-memory fallback ("mock") WITHOUT
// leaking the connection string.
test.describe("GET /api/health", () => {
  test("returns 200 and a well-formed JSON body", async ({ request }) => {
    const res = await request.get("/api/health");

    expect(res.status()).toBe(200);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("application/json");

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("helix");
    // mode is one of the two documented backends — never a raw URL or secret.
    expect(["persistent", "mock"]).toContain(body.mode);
    // Timestamp is present and parseable (ISO 8601).
    expect(typeof body.time).toBe("string");
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  test("does not leak the database connection string", async ({ request }) => {
    const res = await request.get("/api/health");
    const raw = await res.text();
    // Defense-in-depth: the probe must never echo a Postgres URL.
    expect(raw).not.toMatch(/postgres(ql)?:\/\//i);
  });
});
