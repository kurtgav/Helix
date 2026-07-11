import { describe, it, expect } from "vitest";
import type { Evidence } from "@helix/shared";
import { citationsOnly } from "./evidence";

// citationsOnly is the PHI-hygiene gate for the audit trail: evidence snippets
// can carry human-readable PHI (e.g. a member directory line), so anything
// persisted to the log must keep the citation (source + ref) ONLY.
describe("citationsOnly", () => {
  it("strips snippets, keeping only source + ref", () => {
    const evidence: Evidence[] = [
      {
        source: "payer:maxicare/members",
        ref: "#MX-0098-2231",
        snippet: "Juan Dela Cruz — Maxicare Prima — active",
      },
      {
        source: "payer:maxicare/rules",
        ref: "#imaging",
        snippet: "Advanced imaging requires an approved LOA.",
      },
    ];

    const result = citationsOnly(evidence);

    expect(result).toEqual([
      { source: "payer:maxicare/members", ref: "#MX-0098-2231" },
      { source: "payer:maxicare/rules", ref: "#imaging" },
    ]);
    // No snippet survives — the PHI-bearing field is gone.
    for (const item of result) {
      expect(item.snippet).toBeUndefined();
    }
    // The PHI string must not appear anywhere in the output.
    expect(JSON.stringify(result)).not.toContain("Juan Dela Cruz");
  });

  it("is pure — it never mutates the input", () => {
    const original: Evidence[] = [
      { source: "s", ref: "r", snippet: "sensitive" },
    ];
    const snapshot = JSON.stringify(original);

    citationsOnly(original);

    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("returns an empty array for empty input", () => {
    expect(citationsOnly([])).toEqual([]);
  });

  it("handles evidence that already lacks a snippet", () => {
    const evidence: Evidence[] = [{ source: "mock:x", ref: "y" }];
    expect(citationsOnly(evidence)).toEqual([{ source: "mock:x", ref: "y" }]);
  });
});
