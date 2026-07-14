import { describe, it, expect } from "vitest";
import { relatedBySimilarity, tokenize } from "./related";

describe("tokenize", () => {
  it("lowercases, drops short tokens and stopwords", () => {
    expect(tokenize("The Payer adapters ARE the moat, ok?")).toEqual([
      "payer",
      "adapters",
      "moat",
    ]);
  });
});

describe("relatedBySimilarity", () => {
  const docs = [
    { slug: "payers", text: "payer adapters philhealth maxicare eligibility claims denials" },
    { slug: "denials", text: "denied claims payer resubmission eligibility loa documents" },
    { slug: "design", text: "typography tokens color spacing layout hierarchy motion" },
  ];

  it("ranks topically similar docs above unrelated ones", () => {
    const related = relatedBySimilarity(docs, 2);
    expect(related.get("payers")?.[0]).toBe("denials");
    expect(related.get("denials")?.[0]).toBe("payers");
  });

  it("omits zero-similarity neighbours instead of padding", () => {
    const isolated = [
      { slug: "a", text: "alpha beta gamma" },
      { slug: "b", text: "delta epsilon zeta" },
    ];
    const related = relatedBySimilarity(isolated, 3);
    expect(related.get("a")).toEqual([]);
    expect(related.get("b")).toEqual([]);
  });

  it("never includes the doc itself and respects k", () => {
    const related = relatedBySimilarity(docs, 1);
    for (const [slug, neighbours] of related) {
      expect(neighbours).not.toContain(slug);
      expect(neighbours.length).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic", () => {
    expect(relatedBySimilarity(docs, 3)).toEqual(relatedBySimilarity(docs, 3));
  });
});
