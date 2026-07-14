import { test, expect } from "@playwright/test";
import { activate } from "./utils";

// RBAC is the security-critical seam: the demo identity is a cookie (helix_role),
// but the AUTHORIZATION is real — /api/verify gates on `eligibility.run` and
// /api/approve on `loa.approve`, and a `viewer` holds neither. These specs prove
// the enforcement is server-side (a 403 from the route), not merely a hidden
// button, and that the UI honestly reflects the read-only state.
//
// The role is carried in the `helix_role` cookie (see lib/auth.ts AUTH_COOKIE).
// A viewer's permission set (packages/core rbac.ts) is read-only: encounter.read,
// metrics.read, revenue.review — so eligibility + approval both 403.

const AUTH_COOKIE = "helix_role";

// A schema-valid intake (packages/shared intakeInputSchema). Authorization is
// checked BEFORE the body is parsed, so a viewer 403s regardless — but sending a
// valid body keeps the staff assertion a true happy-path 200.
const VALID_INTAKE = {
  patient: { fullName: "Juan Dela Cruz", birthDate: "1990-04-12", sex: "M" },
  coverage: { payerId: "maxicare", memberId: "MX-0244163", planName: "Prima Gold" },
  service: { code: "MRI-BRAIN", name: "MRI (Brain, plain)", category: "imaging" },
};

test.describe("RBAC — server enforcement (API)", () => {
  // Own rate-limit bucket (see lib/rateLimit.ts clientKey) so these POSTs never
  // exhaust the shared "local" window and 429 instead of 403/200.
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.30" } });

  test("viewer is forbidden from running eligibility (403)", async ({ request }) => {
    const res = await request.post("/api/verify", {
      headers: { cookie: `${AUTH_COOKIE}=viewer` },
      data: VALID_INTAKE,
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/permission/i);
  });

  test("viewer is forbidden from approving (403)", async ({ request }) => {
    const res = await request.post("/api/approve", {
      headers: { cookie: `${AUTH_COOKIE}=viewer` },
      data: { encounterId: "enc_does_not_exist", decision: "approved" },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/permission/i);
  });

  test("staff is NOT forbidden from running eligibility", async ({ request }) => {
    const res = await request.post("/api/verify", {
      headers: { cookie: `${AUTH_COOKIE}=staff` },
      data: VALID_INTAKE,
    });

    expect(res.status()).not.toBe(403);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

test.describe("RBAC — UI reflects read-only (viewer)", () => {
  // Distinct rate-limit bucket from the API group and the other specs.
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.40" } });

  test("a viewer submitting /verify gets a permission error, not a decision", async ({
    page,
    context,
  }) => {
    // Establish the origin, then set the demo role cookie for this browser
    // context and reload so the server renders/serves as a viewer.
    await page.goto("/verify");
    const { hostname } = new URL(page.url());
    await context.addCookies([
      { name: AUTH_COOKIE, value: "viewer", domain: hostname, path: "/" },
    ]);
    await page.reload();

    // Prefill and submit — the client fetch to /api/verify carries the cookie and
    // the server returns 403, which the UI surfaces as an inline alert.
    await activate(page.getByRole("button", { name: /^sample$/i }));
    await activate(page.getByRole("button", { name: /verify eligibility/i }));

    await expect(page.getByText(/do not have permission/i)).toBeVisible();
    // No eligibility decision card is ever rendered for a viewer.
    await expect(page.getByRole("article", { name: /eligibility decision/i })).toHaveCount(0);
  });
});
