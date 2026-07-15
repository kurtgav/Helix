import { test, expect } from "@playwright/test";

// Responsive gate: NO surface may ever scroll the document horizontally, at
// any breakpoint. Wide content (tables, the graph, code blocks) must scroll
// inside its own container instead. This is the executable form of the
// "flawless responsive" bar — it caught the pre-i18n appbar overflow and the
// intrinsic-min-width form inputs, so it stays as a permanent tripwire.
//
// Runs once (desktop project) and drives the viewport itself; the mobile
// project would only duplicate the 375/768 rows.

const WIDTHS = [375, 768, 1280, 1440, 1920] as const;
const SURFACES = [
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

test.describe("responsive — zero horizontal document overflow", () => {
  test.skip(({ isMobile }) => isMobile, "viewport is driven explicitly");
  // 40 navigations in one test: give it room without loosening other tests.
  test.setTimeout(120_000);

  test("every surface fits every breakpoint", async ({ page }) => {
    const failures: string[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 950 });
      for (const path of SURFACES) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (overflow > 1) failures.push(`${path} @ ${width}px overflows by ${overflow}px`);
      }
    }
    expect(failures).toEqual([]);
  });
});
