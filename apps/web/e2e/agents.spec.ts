import { test, expect } from "@playwright/test";
import { activate } from "./utils";

// The AI Workforce page: the Executive daily brief (natural-language summary from
// aggregate ROI) and the roster. The load-bearing assertions are that the two
// LIVE teammates — Eligibility & Pre-Auth and Revenue Cycle — are present and
// link to their working surfaces (/verify and /revenue).
test.describe("AI Workforce roster", () => {
  test("renders the executive brief and links the two live teammates", async ({ page }) => {
    await page.goto("/agents");

    await expect(
      page.getByRole("heading", { level: 1, name: /your ai workforce, on the clock/i }),
    ).toBeVisible();

    // Executive brief — labelled region with the three headline stats.
    const brief = page.getByRole("region", { name: /executive daily brief/i });
    await expect(brief).toBeVisible();
    await expect(brief.getByText("Checks run", { exact: true })).toBeVisible();
    await expect(brief.getByText("Recovered", { exact: true })).toBeVisible();
    await expect(brief.getByText("Hours saved", { exact: true })).toBeVisible();

    // Roster headline states how many are live ("... N on the clock.").
    await expect(page.getByRole("heading", { level: 2, name: /on the clock/i })).toBeVisible();

    // The two live teammates link to their surfaces.
    const eligibility = page.getByRole("link", { name: /eligibility & pre-auth/i });
    await expect(eligibility).toBeVisible();
    await expect(eligibility).toHaveAttribute("href", "/verify");

    const revenue = page.getByRole("link", { name: /revenue cycle/i });
    await expect(revenue).toBeVisible();
    await expect(revenue).toHaveAttribute("href", "/revenue");
  });

  test("live teammate links navigate to their working surfaces", async ({ page }) => {
    await page.goto("/agents");

    await activate(page.getByRole("link", { name: /revenue cycle/i }));
    await expect(page).toHaveURL(/\/revenue$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /denied claims, worked back to cash/i }),
    ).toBeVisible();
  });
});
