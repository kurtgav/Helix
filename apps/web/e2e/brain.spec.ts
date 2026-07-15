import { test, expect } from "@playwright/test";
import { activate } from "./utils";

// The brain explorer — the company vault as product surface. These specs prove
// the four load-bearing claims: (1) the vault renders (notes, graph, stats),
// (2) wikilinks resolve and backlinks show, (3) provenance is on-screen, and
// (4) brain.read is REAL — a viewer is denied on the page AND the API.

const AUTH_COOKIE = "helix_role";

test.describe("Brain explorer (staff — default role)", () => {
  test("index lists the vault with stats, graph and sections", async ({ page }) => {
    await page.goto("/brain");

    await expect(page.getByRole("heading", { name: /every decision, inspectable/i })).toBeVisible();
    // Stats tiles are real numbers from the committed vault.
    await expect(page.getByText("markdown, git-versioned")).toBeVisible();
    // The graph rendered server-side with one link per note.
    await expect(page.locator(".graph__svg")).toBeVisible();
    expect(await page.locator(".graph__node").count()).toBeGreaterThanOrEqual(15);
    // Section groupings exist.
    for (const section of ["Strategy", "Architecture", "The Loop", "Delivery"]) {
      await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
    }
  });

  test("a note renders markdown, provenance and backlinks; wikilinks navigate", async ({
    page,
  }) => {
    await page.goto("/brain/decisions");

    await expect(page.getByRole("heading", { name: /decision log/i })).toBeVisible();

    // Provenance header shows the model + run + confidence from frontmatter.
    // The run number moves whenever the decision log gains an ADR — assert the
    // shape, not a pinned iteration.
    const provenance = page.locator(".prov");
    await expect(provenance).toBeVisible();
    await expect(provenance).toContainText("claude-fable-5");
    await expect(provenance).toContainText(/iteration-\d+/);

    // Backlinks: the index links to decisions, so "Linked from" is non-empty.
    const backlinks = page.locator(".conn__group", { hasText: "Linked from" });
    await expect(backlinks).toBeVisible();
    await expect(backlinks.locator(".conn__link").first()).toBeVisible();

    // A resolved wikilink inside the body navigates to another note.
    // Keyboard activation (see utils.ts): pointer clicks can be intercepted by
    // the sticky translucent appbar on small viewports.
    const bodyLink = page.locator(".note-body a[href^='/brain/']").first();
    await activate(bodyLink);
    await expect(page).toHaveURL(/\/brain\/[a-z0-9-]+/i);
    await expect(page.locator(".prov")).toBeVisible();
  });

  test("full-text search returns ranked hits and navigates", async ({ page }) => {
    await page.goto("/brain");

    // focus() + fill() skip the pointer hit-test (the sticky appbar can
    // intercept clicks on small viewports); onFocus also lazy-loads the index.
    const input = page.getByRole("searchbox", { name: /search the brain/i });
    await input.focus();
    await input.fill("denials");

    const results = page.locator(".bsearch__results");
    await expect(results).toBeVisible();
    await expect(page.locator(".bsearch__meta")).toContainText(/match/i);
    const firstHit = page.locator(".bsearch__hit").first();
    await activate(firstHit);
    await expect(page).toHaveURL(/\/brain\/[a-z0-9-]+/i);
  });

  test("unknown note slugs 404", async ({ page }) => {
    const response = await page.goto("/brain/not-a-real-note");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Brain explorer (viewer — RBAC denial)", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.77" } });

  test("viewer sees the access notice, not company memory", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    await context.addCookies([
      {
        name: AUTH_COOKIE,
        value: "viewer",
        url: baseURL!,
      },
    ]);
    const page = await context.newPage();
    await page.goto("/brain");

    await expect(page.getByRole("heading", { name: /staff-only/i })).toBeVisible();
    // No vault content leaks: no graph, no note cards, no search corpus.
    await expect(page.locator(".graph__svg")).toHaveCount(0);
    await expect(page.locator(".note-card")).toHaveCount(0);

    await context.close();
  });

  test("the search-index API 403s a viewer (server enforcement)", async ({ request }) => {
    const res = await request.get("/api/brain/index", {
      headers: { cookie: `${AUTH_COOKIE}=viewer` },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("the search-index API serves staff the full corpus", async ({ request }) => {
    const res = await request.get("/api/brain/index", {
      headers: { cookie: `${AUTH_COOKIE}=staff` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.docs.length).toBeGreaterThanOrEqual(18);
    const slugs = body.data.docs.map((d: { slug: string }) => d.slug);
    expect(slugs).toContain("decisions");
    expect(slugs).toContain("00-INDEX");
  });
});
