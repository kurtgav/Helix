import { test, expect } from "@playwright/test";

// The Revenue Cycle agent surface: headline recoverable pesos, a per-claim triage
// table, and the human-in-the-loop resolve control. The resolve control is the
// RBAC-gated bit — enabled for staff (revenue.resolve), disabled + read-only for a
// viewer. The server re-enforces this too; here we assert the UI reflects it.

const AUTH_COOKIE = "helix_role";

test.describe("Revenue Cycle triage", () => {
  test("headlines recoverable pesos and renders triage rows", async ({ page }) => {
    await page.goto("/revenue");

    await expect(
      page.getByRole("heading", { level: 1, name: /denied claims, worked back to cash/i }),
    ).toBeVisible();

    // Recoverable-pesos headline.
    const summary = page.getByRole("region", { name: /recoverable summary/i });
    await expect(summary).toBeVisible();
    await expect(summary.getByText(/recoverable this batch/i)).toBeVisible();
    await expect(summary.getByText(/₱/).first()).toBeVisible();

    // Per-claim triage table with the denial-reason column and data rows.
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /denial reason/i }),
    ).toBeVisible();
    expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  });

  test("staff can resolve — the controls are enabled", async ({ page }) => {
    // Default identity is staff (no cookie), which holds revenue.resolve.
    await page.goto("/revenue");

    await expect(page.getByRole("button", { name: /approve recovery/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /won.?t pursue/i })).toBeEnabled();
    await expect(page.getByText(/logged to the audit trail/i)).toBeVisible();
  });

  test("viewer cannot resolve — controls are disabled with a read-only hint", async ({
    page,
    context,
  }) => {
    await page.goto("/revenue");
    const { hostname } = new URL(page.url());
    await context.addCookies([
      { name: AUTH_COOKIE, value: "viewer", domain: hostname, path: "/" },
    ]);
    await page.reload();

    await expect(page.getByRole("button", { name: /approve recovery/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /won.?t pursue/i })).toBeDisabled();
    await expect(page.getByText(/read-only role/i)).toBeVisible();
  });
});
