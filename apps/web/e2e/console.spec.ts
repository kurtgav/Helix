import { test, expect } from "@playwright/test";

// The Operations Console — recent activity + the append-only, immutable audit
// trail. The trust claim of the product is that autonomy stays accountable AND
// PHI-free, so these specs assert both the structure and the data-minimization:
// no patient identifiers cross the console boundary.

// Medical service names legitimately contain Title-Case word pairs (a lab panel
// or a specialty). They are NOT patient names, so the full-name scan below allows
// them. Anything else that looks like "Firstname Lastname" inside a single data
// cell / ledger row is treated as a PHI leak and fails the test.
const ALLOWED_BIGRAMS = new Set(["Complete Blood", "Blood Count", "Internal Medicine"]);
const FULL_NAME = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g;

// Scan each text snippet independently (a single cell or ledger row) so the regex
// can never bridge two adjacent-but-separate values (e.g. a "Maxicare" payer cell
// followed by an "Approved" status cell) into a false "full name".
function fullNameSuspects(snippets: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of snippets) {
    const norm = raw.replace(/\s+/g, " ");
    for (const match of norm.match(FULL_NAME) ?? []) {
      if (!ALLOWED_BIGRAMS.has(match)) out.push(match);
    }
  }
  return out;
}

test.describe("Operations Console", () => {
  test("renders recent activity and the immutable audit trail", async ({ page }) => {
    await page.goto("/console");

    await expect(
      page.getByRole("heading", { level: 1, name: /every action, on the record/i }),
    ).toBeVisible();

    // Recent activity: a table of encounters.
    const activity = page.getByRole("region", { name: /recent activity/i });
    await expect(activity).toBeVisible();
    await expect(activity.getByRole("table")).toBeVisible();
    await expect(activity.getByRole("columnheader", { name: /service/i })).toBeVisible();
    expect(await activity.getByRole("row").count()).toBeGreaterThan(1);

    // Immutable audit trail + the append-only / immutable marker.
    const audit = page.getByRole("region", { name: /audit trail/i });
    await expect(audit).toBeVisible();
    await expect(audit.getByText(/append-only/i)).toBeVisible();
    await expect(audit.getByText(/immutable/i).first()).toBeVisible();
    // The ledger is an ordered (append-order) list.
    await expect(audit.getByRole("list")).toBeVisible();
  });

  test("exposes no obvious PHI (identifier-free by design)", async ({ page }) => {
    await page.goto("/console");

    const activity = page.getByRole("region", { name: /recent activity/i });
    const audit = page.getByRole("region", { name: /audit trail/i });
    await expect(activity).toBeVisible();
    await expect(audit).toBeVisible();

    // The panel states the discipline explicitly.
    await expect(activity.getByText(/no patient identifiers/i)).toBeVisible();

    // No "Firstname Lastname" tokens in the data itself — scanned per encounter
    // cell and per ledger row so the check can't bridge across separate values.
    const activityCells = await activity.getByRole("cell").allInnerTexts();
    const auditRows = await audit.getByRole("listitem").allInnerTexts();
    const suspects = fullNameSuspects([...activityCells, ...auditRows]);
    expect(
      suspects,
      `Console data contained full-name-like tokens: ${suspects.join(", ")}`,
    ).toEqual([]);

    // Targeted PHI guards over the whole document: no member IDs, no long numeric
    // identifiers, no canonical patient name, and no raw patient initials (the
    // encounter table drops them by design — this catches a regression that
    // re-introduces them).
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/Juan\s+Dela\s+Cruz/i);
    expect(bodyText).not.toMatch(/\bMX-?\d{5,}\b/i);
    expect(bodyText).not.toMatch(/\b\d{9,}\b/);
    for (const initials of ["J.D.C.", "M.R.S.", "A.L.P."]) {
      expect(bodyText).not.toContain(initials);
    }
  });
});
