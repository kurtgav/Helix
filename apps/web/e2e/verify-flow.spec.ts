import { test, expect } from "@playwright/test";
import { activate } from "./utils";

// Isolate this spec's requests into their own rate-limit bucket. The limiter keys
// on the first x-forwarded-for hop (lib/rateLimit.ts clientKey) and allows 30
// req/60s; giving each API-hitting spec a distinct client IP keeps the shared
// "local" window from being exhausted by neighbouring specs or rapid re-runs
// (which would surface as 429 flakiness). Applies to the page's own fetch() too.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.20" } });

// The core demo journey as the default identity (front-desk staff): intake →
// verify → eligibility decision (status + drafted LOA) → human approval recorded.
// Selectors are accessible (role/label/text), and every wait is a web-first
// assertion — no fixed timeouts — so the spec stays deterministic.
test.describe("Verify → approve (staff)", () => {
  test("verifies a Maxicare MRI walk-in and records an approval", async ({ page }) => {
    await page.goto("/verify");

    await expect(page.getByRole("heading", { level: 1, name: /verify a walk-in/i })).toBeVisible();

    // Prefill a valid synthetic walk-in (Maxicare · MRI-BRAIN) via the built-in
    // "Sample" affordance — resilient to field re-labeling and the canonical
    // demo case the product ships.
    await activate(page.getByRole("button", { name: /^sample$/i }));

    // Submit the intake.
    await activate(page.getByRole("button", { name: /verify eligibility/i }));

    // The eligibility decision card renders with a recognizable status, a drafted
    // Letter of Authorization, and the confidence meter.
    const decision = page.getByRole("article", { name: /eligibility decision/i });
    await expect(decision).toBeVisible();
    await expect(
      decision.getByText(/^(Eligible|Needs review|Not eligible)$/),
    ).toBeVisible();
    await expect(decision.getByText(/drafted letter of authorization/i)).toBeVisible();
    await expect(decision.getByRole("meter", { name: /model confidence/i })).toBeVisible();

    // Policy intelligence: deterministic, cited checks against the member's
    // policy terms — incl. the forward-looking claim-filing window.
    await expect(
      decision.getByRole("heading", { name: /policy checks/i }),
    ).toBeVisible();
    await expect(decision.getByText(/claim filing window/i)).toBeVisible();
    await expect(decision.getByText(/coverage window/i)).toBeVisible();

    // Human-in-the-loop: approve, then assert the recorded/logged outcome.
    await activate(decision.getByRole("button", { name: /^approve$/i }));

    const outcome = page.getByRole("status");
    await expect(outcome).toContainText(/logged/i);
    await expect(outcome).toContainText(/approved/i);

    // The decision controls are replaced by the outcome — no lingering Approve.
    await expect(decision.getByRole("button", { name: /^approve$/i })).toHaveCount(0);
  });

  test("fills the intake by hand and reaches a decision", async ({ page }) => {
    await page.goto("/verify");

    // Accessible-label-driven intake, independent of the Sample shortcut.
    await page.getByLabel(/full name/i).fill("Juan Dela Cruz");
    await page.getByLabel(/birth date/i).fill("1984-03-12");
    await page.getByLabel(/^sex/i).selectOption("M");
    await page.getByLabel(/payer/i).selectOption("maxicare");
    await page.getByLabel(/member id/i).fill("MX-000123456");
    await page.getByLabel(/^plan/i).fill("Prime Gold");
    await page.getByLabel(/requested service/i).selectOption("MRI-BRAIN");

    await activate(page.getByRole("button", { name: /verify eligibility/i }));

    await expect(page.getByRole("article", { name: /eligibility decision/i })).toBeVisible();
  });
});
