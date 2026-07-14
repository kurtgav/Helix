import { test, expect } from "@playwright/test";
import { activate } from "./utils";

// EN/FIL localization (ADR-010). Three load-bearing claims:
//   1. EN is the default (every other spec in this suite asserts English copy —
//      they are the regression net for that).
//   2. Switching to FIL via the appbar chip re-renders the product chrome in
//      Filipino and persists across navigation (cookie-backed).
//   3. The locale cookie is validated server-side: garbage falls back to EN.

const LOCALE_COOKIE = "helix_locale";

test.describe("EN/FIL locale", () => {
  test("FIL chip switches the app copy and persists across surfaces", async ({ page }) => {
    await page.goto("/dashboard");
    // Default is EN.
    await expect(page.getByRole("heading", { name: /earned its keep/i })).toBeVisible();

    // Switch to FIL via the appbar switcher (a real server action round-trip).
    await activate(page.getByRole("button", { name: "FIL", exact: true }));
    await expect(page.getByRole("heading", { name: /sinulit ni Helix/i })).toBeVisible();

    // Persisted: navigating renders FIL on other surfaces.
    await page.goto("/verify");
    await expect(page.getByRole("heading", { name: /i-verify ang walk-in/i })).toBeVisible();
    await expect(page.getByLabel(/buong pangalan/i)).toBeVisible();

    await page.goto("/console");
    await expect(page.getByRole("heading", { name: /bawat aksyon, nakatala/i })).toBeVisible();

    await page.goto("/revenue");
    await expect(
      page.getByRole("heading", { name: /ibinabalik sa cash/i }),
    ).toBeVisible();

    await page.goto("/agents");
    await expect(page.getByRole("heading", { name: /naka-duty/i }).first()).toBeVisible();

    await page.goto("/brain");
    await expect(
      page.getByRole("heading", { name: /bawat desisyon, masisiyasat/i }),
    ).toBeVisible();

    // And back to EN.
    await activate(page.getByRole("button", { name: "EN", exact: true }));
    await expect(page.getByRole("heading", { name: /every decision, inspectable/i })).toBeVisible();
  });

  test("the FIL verify flow works end-to-end (form → decision in Filipino)", async ({
    page,
    baseURL,
    context,
  }) => {
    await context.addCookies([{ name: LOCALE_COOKIE, value: "fil", url: baseURL! }]);
    await page.goto("/verify");

    // Load the sample walk-in and submit, all through the FIL chrome.
    await activate(page.getByRole("button", { name: "Sample" }));
    await activate(page.getByRole("button", { name: /i-verify ang eligibility/i }));

    // The decision card renders in Filipino (status label from the dict).
    const banner = page.locator(".erc__banner");
    await expect(banner).toBeVisible();
    await expect(page.getByText("Desisyon sa eligibility")).toBeVisible();
    // Approval affordance is localized too.
    await expect(page.getByRole("button", { name: "Aprubahan" })).toBeVisible();
  });

  test("a garbage locale cookie falls back to EN (server-side validation)", async ({
    page,
    baseURL,
    context,
  }) => {
    await context.addCookies([{ name: LOCALE_COOKIE, value: "xx-junk", url: baseURL! }]);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /earned its keep/i })).toBeVisible();
  });
});
