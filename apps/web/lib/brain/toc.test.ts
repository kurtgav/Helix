import { describe, it, expect } from "vitest";
import { extractHeadings, slugifyHeading } from "./toc";

describe("slugifyHeading", () => {
  it("lowercases and reduces to alphanumerics + hyphens", () => {
    expect(slugifyHeading("The Loop")).toBe("the-loop");
    expect(slugifyHeading("Payer / LGU — PhilHealth (2026)")).toBe("payer-lgu-philhealth-2026");
  });

  it("trims leading and trailing separator runs", () => {
    expect(slugifyHeading("  ¡Hola! denials  ")).toBe("hola-denials");
    expect(slugifyHeading("---")).toBe("");
  });
});

describe("extractHeadings", () => {
  it("returns h2/h3 in document order with depth, text and id", () => {
    const md = "# Title\n\nIntro.\n\n## Strategy\n\nBody.\n\n### The Wedge\n\n## Delivery\n";
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "Strategy", id: "strategy" },
      { depth: 3, text: "The Wedge", id: "the-wedge" },
      { depth: 2, text: "Delivery", id: "delivery" },
    ]);
  });

  it("ignores h1 and h4+ (the TOC outlines sections, not the title or fine print)", () => {
    const md = "# Top\n\n#### Deep\n\n## Kept\n";
    expect(extractHeadings(md).map((h) => h.id)).toEqual(["kept"]);
  });

  it("does NOT count # lines inside fenced code blocks", () => {
    const md = "## Real\n\n```bash\n## not a heading\n# also not\n```\n\n### After fence\n";
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "Real", id: "real" },
      { depth: 3, text: "After fence", id: "after-fence" },
    ]);
  });

  it("dedupes repeated headings with -2, -3 suffixes", () => {
    const md = "## Risks\n\n### Risks\n\n## Risks\n";
    expect(extractHeadings(md).map((h) => h.id)).toEqual(["risks", "risks-2", "risks-3"]);
  });

  it("never emits a duplicate id even when a literal heading collides with a suffix", () => {
    const md = "## Risks\n\n## Risks-2\n\n## Risks\n";
    const ids = extractHeadings(md).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["risks", "risks-2", "risks-3"]);
  });

  it("strips inline markdown from the text (matching what the reader sees)", () => {
    const md = "## Verify `eligibility` **fast**\n\n### See [wedge](/brain/wedge)\n";
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "Verify eligibility fast", id: "verify-eligibility-fast" },
      { depth: 3, text: "See wedge", id: "see-wedge" },
    ]);
  });

  it("handles closing hash sequences and symbol-only headings", () => {
    const md = "## Closing ##\n\n## → ##\n";
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "Closing", id: "closing" },
      { depth: 2, text: "→", id: "section" },
    ]);
  });

  it("returns an empty list for markdown with no h2/h3", () => {
    expect(extractHeadings("# Only a title\n\nProse.")).toEqual([]);
    expect(extractHeadings("")).toEqual([]);
  });
});
