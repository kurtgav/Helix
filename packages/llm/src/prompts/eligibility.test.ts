import { describe, it, expect } from "vitest";
import {
  PROMPT_VERSION,
  buildEligibilityPrompt,
  eligibilityRequest,
  ELIGIBILITY_SYSTEM_PROMPT,
} from "./eligibility";
import type { EligibilityPromptInput } from "./eligibility";

const input: EligibilityPromptInput = {
  payer: { name: "Maxicare", kind: "hmo" },
  coverage: { planName: "Gold", status: "active", memberId: "MX-123" },
  service: { code: "MRI-BRAIN", name: "MRI of the brain", category: "imaging" },
  retrievedRequirements: [
    {
      label: "LOA required for imaging",
      source: "payer:maxicare/rules",
      ref: "sec-4.2",
      snippet: "Advanced imaging requires an approved LOA.",
    },
  ],
};

describe("eligibility prompt", () => {
  it("exposes a stable PROMPT_VERSION", () => {
    expect(PROMPT_VERSION).toBe("eligibility-v1");
  });

  it("includes payer, service, and retrieved requirements", () => {
    const prompt = buildEligibilityPrompt(input);
    expect(prompt).toContain("Maxicare");
    expect(prompt).toContain("MRI of the brain");
    expect(prompt).toContain("payer:maxicare/rules");
    expect(prompt).toContain("sec-4.2");
  });

  it("instructs the model to cite evidence and prefer needs_review", () => {
    const prompt = buildEligibilityPrompt(input);
    expect(prompt.toLowerCase()).toContain("needs_review");
    expect(prompt.toLowerCase()).toContain("evidence");
  });

  it("signals absence of retrieved rules explicitly", () => {
    const prompt = buildEligibilityPrompt({
      ...input,
      retrievedRequirements: [],
    });
    expect(prompt).toContain("none retrieved");
  });

  it("eligibilityRequest wires the system prompt and allows overrides", () => {
    const r = eligibilityRequest(input, { maxTokens: 1024 });
    expect(r.system).toBe(ELIGIBILITY_SYSTEM_PROMPT);
    expect(r.prompt).toContain("MRI-BRAIN");
    expect(r.maxTokens).toBe(1024);
  });
});
