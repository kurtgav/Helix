import { expect, type Locator } from "@playwright/test";

// Shared e2e helpers. This file is intentionally NOT a *.spec.ts, so Playwright's
// test matcher ignores it — it is imported by the specs, never run as one.

// Activate a control (button or link) via the KEYBOARD instead of a pointer click.
//
// Why: the app chrome header is sticky AND translucent (`position: sticky; top: 0;
// z-index: 50` + `backdrop-filter: blur()` — see app/globals.css `.appbar`). On a
// narrow mobile viewport it wraps to a tall bar that overlays whatever scrolls
// beneath it, so a control scrolled to the top rests *behind* the header. A
// pointer click then fails its hit-test (the header "intercepts pointer events"),
// and Playwright's internal scroll-into-view keeps re-parking the target under the
// bar. Keyboard activation needs no hit-test: it only requires the element to be
// visible, enabled, and focusable — which is precisely how a keyboard user reaches
// it. So this is both obstruction-proof and a stronger accessibility guarantee.
// Deterministic — no fixed timeouts.
export async function activate(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await locator.press("Enter");
}
