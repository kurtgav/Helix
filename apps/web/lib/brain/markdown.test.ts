import { describe, it, expect } from "vitest";
import {
  countWords,
  extractExcerpt,
  extractTitle,
  extractWikilinks,
  humanizeSlug,
  stripLeadingH1,
  toPlainText,
  transformWikilinks,
} from "./markdown";

const KNOWN = new Set(["journal", "tech-stack"]);

describe("transformWikilinks", () => {
  it("rewrites a known target to a /brain link", () => {
    expect(transformWikilinks("See [[journal]].", KNOWN)).toBe("See [journal](/brain/journal).");
  });

  it("uses the alias as the label when present", () => {
    expect(transformWikilinks("Read [[journal|the log]] now", KNOWN)).toBe(
      "Read [the log](/brain/journal) now",
    );
  });

  it("drops the heading fragment but keeps the target", () => {
    expect(transformWikilinks("[[tech-stack#llm]]", KNOWN)).toBe("[tech-stack](/brain/tech-stack)");
  });

  it("marks unknown targets as missing stubs instead of dead links", () => {
    expect(transformWikilinks("[[ghost-note]]", KNOWN)).toBe("[ghost-note](#missing-ghost-note)");
  });

  it("leaves fenced code blocks untouched", () => {
    const md = "before\n```\n[[journal]]\n```\nafter [[journal]]";
    const out = transformWikilinks(md, KNOWN);
    expect(out).toContain("```\n[[journal]]\n```");
    expect(out).toContain("after [journal](/brain/journal)");
  });
});

describe("extractWikilinks", () => {
  it("collects distinct targets, ignoring aliases and headings", () => {
    const md = "[[a]] then [[a|alias]] and [[b#sec]] plus [[c]]";
    expect(extractWikilinks(md).sort()).toEqual(["a", "b", "c"]);
  });

  it("ignores targets inside code fences", () => {
    expect(extractWikilinks("```\n[[hidden]]\n```\n[[shown]]")).toEqual(["shown"]);
  });
});

describe("extractTitle", () => {
  it("takes the first h1 and strips leading emoji", () => {
    expect(extractTitle("---\n---\n# 🧬 Helix — Brain\ntext", "x")).toBe("Helix — Brain");
  });

  it("falls back to a humanized slug when no heading exists", () => {
    expect(extractTitle("no headings here", "ph-payer-landscape")).toBe("Ph Payer Landscape");
  });
});

describe("extractExcerpt", () => {
  it("returns the first real paragraph, markdown stripped", () => {
    const md = "# Title\n\n> a quote to skip\n\nThis **bold** wedge is [[real]].\n\nSecond.";
    expect(extractExcerpt(md)).toBe("This bold wedge is real.");
  });

  it("clamps long paragraphs with an ellipsis", () => {
    const md = `Para ${"word ".repeat(80)}end`;
    const excerpt = extractExcerpt(md, 50);
    expect(excerpt.length).toBeLessThanOrEqual(50);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("returns empty for a document with no prose", () => {
    expect(extractExcerpt("# Only\n## Headings")).toBe("");
  });
});

describe("toPlainText / countWords", () => {
  it("keeps heading, list, table and quote words but drops syntax", () => {
    const md = "# Head\n- item one\n> quoted\n\n| a | b |\n|---|---|\n| c | d |\n\n`code` and [link](/x)";
    const plain = toPlainText(md);
    expect(plain).toContain("Head");
    expect(plain).toContain("item one");
    expect(plain).toContain("quoted");
    expect(plain).toContain("c d");
    expect(plain).toContain("code and link");
    expect(plain).not.toContain("#");
    expect(plain).not.toContain("|");
  });

  it("drops fenced code and html comments from the corpus", () => {
    const plain = toPlainText("keep\n```\nsecret()\n```\n<!-- note -->\nalso");
    expect(plain).toBe("keep also");
  });

  it("counts words on the stripped text", () => {
    expect(countWords(toPlainText("one two three"))).toBe(3);
    expect(countWords("")).toBe(0);
  });
});

describe("humanizeSlug", () => {
  it("title-cases dashed slugs", () => {
    expect(humanizeSlug("risks-and-kill-criteria")).toBe("Risks And Kill Criteria");
  });
});

describe("stripLeadingH1", () => {
  it("removes only the leading h1, keeping the rest intact", () => {
    expect(stripLeadingH1("\n# Title\n\nBody with # hash")).toBe("\nBody with # hash");
  });

  it("leaves documents without a leading h1 alone", () => {
    expect(stripLeadingH1("Intro first\n# Later heading")).toBe("Intro first\n# Later heading");
    expect(stripLeadingH1("## h2 first")).toBe("## h2 first");
  });
});
