import { test, expect } from "@playwright/test";

// Happy-path stub for the v0 demo script: intake -> verify -> result -> approve.
// Uses accessible, deterministic selectors (roles/labels), not CSS classes.

test("dashboard shows the ROI panel and a CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: /return on investment/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /new verification/i })).toBeVisible();
});

test("verify a Maxicare MRI walk-in and approve", async ({ page }) => {
  await page.goto("/verify");

  await page.getByLabel(/full name/i).fill("Juan Dela Cruz");
  await page.getByLabel(/birth date/i).fill("1984-03-12");
  await page.getByLabel(/^sex/i).selectOption("M");
  await page.getByLabel(/payer/i).selectOption("maxicare");
  await page.getByLabel(/member id/i).fill("MX-000123456");
  await page.getByLabel(/plan/i).fill("Prime Gold");
  await page.getByLabel(/requested service/i).selectOption("MRI-BRAIN");

  await page.getByRole("button", { name: /^verify$/i }).click();

  // Result card renders with a status badge and decision controls.
  await expect(page.getByText(/eligibility result/i)).toBeVisible();
  await page.getByRole("button", { name: /^approve$/i }).click();
  await expect(page.getByRole("status")).toContainText(/logged/i);
});
