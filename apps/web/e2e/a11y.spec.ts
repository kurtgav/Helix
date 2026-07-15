import { test, expect, type Page } from "@playwright/test";

// Dependency-free accessibility smoke over every primary surface. These are
// structural, high-signal invariants Playwright can assert from the accessibility
// tree with no extra tooling:
//   1. exactly one <h1> (a single, clear main heading per page)
//   2. exactly one <main> landmark
//   3. no unlabeled interactive controls (every button/link has an accessible
//      name; decorative icons are aria-hidden and thus absent from the tree)
//
// FOLLOW-UP (documented, intentionally not added here): a full WCAG rule sweep
// with @axe-core/playwright (color contrast, ARIA misuse, duplicate ids, etc.).
// That pulls in an npm dependency, which this task forbids — wire it into CI as a
// separate step: `pnpm add -D @axe-core/playwright` then run
// `new AxeBuilder({ page }).analyze()` per route and assert zero violations.

const ROUTES = [
  "/",
  "/dashboard",
  "/verify",
  "/console",
  "/revenue",
  "/ledger",
  "/agents",
  "/brain",
  "/brain/decisions",
] as const;

async function assertLandmarksAndHeadings(page: Page): Promise<void> {
  // Exactly one main heading.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  // Exactly one main landmark.
  await expect(page.getByRole("main")).toHaveCount(1);
}

async function assertNoUnlabeledControls(page: Page): Promise<void> {
  // Every interactive control exposed to assistive tech must carry a non-empty
  // accessible name. An icon-only button whose only content is an aria-hidden
  // glyph would be counted in `all` but not in `named`, failing this check.
  for (const role of ["button", "link"] as const) {
    const all = await page.getByRole(role).count();
    const named = await page.getByRole(role, { name: /\S/ }).count();
    expect(named, `every <${role}> on the page must have an accessible name`).toBe(all);
  }

  // Any image surfaced to AT must be labeled (decorative icons are aria-hidden
  // and excluded from the tree, so this is typically 0 === 0).
  const imgs = await page.getByRole("img").count();
  const namedImgs = await page.getByRole("img", { name: /\S/ }).count();
  expect(namedImgs, "every image exposed to assistive tech must have alt text").toBe(imgs);
}

for (const route of ROUTES) {
  test.describe(`a11y: ${route}`, () => {
    test("has one h1, one main landmark, and no unlabeled controls", async ({ page }) => {
      await page.goto(route);
      // Wait for the primary heading before probing structure.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      await assertLandmarksAndHeadings(page);
      await assertNoUnlabeledControls(page);
    });
  });
}
