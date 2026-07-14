import { test, expect } from "@playwright/test";

// Dashboard smoke — the landing surface of the app shell: the live ROI panel and
// the primary call-to-action into the verification flow. (The full intake →
// verify → approve journey lives in verify-flow.spec.ts; RBAC in rbac.spec.ts.)
test.describe("Dashboard", () => {
  test("shows the ROI panel and the primary CTA", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The Return-on-investment region with its headline tiles.
    const roi = page.getByRole("region", { name: /return on investment/i });
    await expect(roi).toBeVisible();
    await expect(roi.getByText(/checks run/i)).toBeVisible();
    await expect(roi.getByText(/hours saved/i)).toBeVisible();

    // Primary CTA routes into the verification flow.
    const cta = page.getByRole("link", { name: /new verification/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/verify");
  });

  test("the app nav exposes every primary surface", async ({ page }) => {
    await page.goto("/dashboard");

    const nav = page.getByRole("navigation", { name: /product/i });
    for (const label of ["Dashboard", "Verify", "Console", "Revenue", "Agents"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });
});
