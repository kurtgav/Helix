import { test, expect } from "@playwright/test";

// The Receivables agent surface (/ledger): headline past-window pesos, measured
// payer scorecards, the collections forecast, the claim ledger with each
// payer's own payment window, and the human-in-the-loop follow-up control.
// The resolve control is RBAC-gated exactly like /revenue — enabled for staff
// (revenue.resolve), disabled + read-only for a viewer.

const AUTH_COOKIE = "helix_role";

test.describe("Receivables ledger", () => {
  test("headlines past-window pesos and renders the scoreboard", async ({ page }) => {
    await page.goto("/ledger");

    await expect(
      page.getByRole("heading", { level: 1, name: /what payers owe you/i }),
    ).toBeVisible();

    // Past-window headline with peso amounts.
    const summary = page.getByRole("region", { name: /outstanding summary/i });
    await expect(summary).toBeVisible();
    await expect(summary.getByText(/past the payer's own deadline/i)).toBeVisible();
    await expect(summary.getByText(/₱/).first()).toBeVisible();

    // Payer scorecards: one per demo payer, graded from measured behavior.
    const scorecards = page.getByRole("region", { name: /payer scorecards/i });
    await expect(scorecards).toBeVisible();
    await expect(scorecards.getByText("Maxicare")).toBeVisible();
    // The demo villain: Medicard is overdue + short-paying → grade D.
    await expect(
      scorecards.locator('.scorecard[data-grade="D"]').getByText("Medicard"),
    ).toBeVisible();
    await expect(scorecards.getByText(/median days to pay/i).first()).toBeVisible();
  });

  test("tracks every claim against the payer's own payment window", async ({ page }) => {
    await page.goto("/ledger");

    await expect(page.getByRole("columnheader", { name: /payer window/i })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Standing", exact: true }),
    ).toBeVisible();
    expect(await page.getByRole("row").count()).toBeGreaterThan(1);

    // Open claims show a countdown; overdue ones say the window closed.
    expect(await page.getByText(/\dd left/).count()).toBeGreaterThan(0);
    expect(await page.getByText(/closed \d{4}-\d{2}-\d{2}/).count()).toBeGreaterThan(0);
    // Every standing the engine can produce is exercised by the demo ledger.
    const table = page.getByRole("region", { name: /claim ledger/i });
    await expect(table.getByText(/^overdue$/i).first()).toBeVisible();
    await expect(table.getByText(/^settled$/i).first()).toBeVisible();
    await expect(table.getByText(/underpaid/i).first()).toBeVisible();
  });

  test("projects collections and cites the governing payment rules", async ({ page }) => {
    await page.goto("/ledger");

    // Forecast buckets are always the same four shapes.
    const forecast = page.getByRole("region", { name: /collections forecast/i });
    await expect(forecast).toBeVisible();
    await expect(forecast.getByText("0–7d")).toBeVisible();
    await expect(forecast.getByText("31d+")).toBeVisible();

    // The follow-up draft cites the verified PhilHealth payment rule.
    const draft = page.getByRole("region", { name: /drafted follow-up/i });
    await expect(draft).toBeVisible();
    await expect(draft.getByText(/payment status follow-up/i).first()).toBeVisible();
    await expect(draft.getByText(/G\.R\. No\. 214485/).first()).toBeVisible();

    // Cited sources include both payment rules in play.
    await expect(page.getByText("reg:philhealth/philhealth-claim-payment").first()).toBeVisible();
    await expect(page.getByText("reg:helix/hmo-claim-payment").first()).toBeVisible();
  });

  test("staff can approve follow-ups — the controls are enabled", async ({ page }) => {
    // Default identity is staff (no cookie), which holds revenue.resolve.
    await page.goto("/ledger");

    await expect(page.getByRole("button", { name: /approve follow-ups/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /hold for now/i })).toBeEnabled();
    await expect(page.getByText(/logged to the audit trail/i)).toBeVisible();
  });

  test("approving records the decision to the live status region", async ({ page }) => {
    await page.goto("/ledger");

    await page.getByRole("button", { name: /approve follow-ups/i }).click();
    await expect(page.getByRole("status")).toContainText(/approved — logged/i);
  });

  test("viewer cannot approve — controls are disabled with a read-only hint", async ({
    page,
    context,
  }) => {
    await page.goto("/ledger");
    const { hostname } = new URL(page.url());
    await context.addCookies([
      { name: AUTH_COOKIE, value: "viewer", domain: hostname, path: "/" },
    ]);
    await page.reload();

    await expect(page.getByRole("button", { name: /approve follow-ups/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /hold for now/i })).toBeDisabled();
    await expect(page.getByText(/read-only role/i)).toBeVisible();
  });
});
