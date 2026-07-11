import { describe, it, expect } from "vitest";
import { eligibilityResultSchema } from "@helix/shared";
import { MockProvider } from "./mock";
import type { CompletionRequest } from "../provider";

const req: CompletionRequest = { prompt: "check eligibility" };

describe("MockProvider", () => {
  it("complete() returns deterministic canned text", async () => {
    const p = new MockProvider();
    const a = await p.complete(req);
    const b = await p.complete(req);
    expect(a.ok).toBe(true);
    if (a.ok && b.ok) expect(a.data.text).toBe(b.data.text);
  });

  it("completeJSON() returns a schema-valid EligibilityResult by default", async () => {
    const p = new MockProvider();
    const res = await p.completeJSON(req, eligibilityResultSchema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe("needs_review");
      expect(res.data.evidence.length).toBeGreaterThan(0);
    }
  });

  it("completeJSON() rejects malformed model output", async () => {
    const p = new MockProvider({ respondText: () => "not json at all" });
    const res = await p.completeJSON(req, eligibilityResultSchema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("llm.invalid_json");
  });

  it("completeJSON() rejects JSON that violates the schema", async () => {
    const p = new MockProvider({ respondJson: () => ({ status: "maybe" }) });
    const res = await p.completeJSON(req, eligibilityResultSchema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("llm.schema_validation");
  });

  it("supports injected deterministic output shaped by input", async () => {
    const p = new MockProvider({
      respondJson: (r) => ({
        status: "needs_review",
        requirements: [],
        gaps: [{ kind: "data", message: r.prompt, blocking: false }],
        evidence: [{ source: "mock:test", ref: "x" }],
        checkedAt: "2025-01-01T00:00:00.000Z",
      }),
    });
    const res = await p.completeJSON(req, eligibilityResultSchema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.gaps[0]?.message).toBe("check eligibility");
  });
});
