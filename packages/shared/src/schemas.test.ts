import { describe, it, expect } from "vitest";
import { intakeInputSchema, eligibilityResultSchema } from "./index";

describe("intakeInputSchema", () => {
  it("accepts a valid intake", () => {
    const parsed = intakeInputSchema.safeParse({
      patient: { fullName: "Juan Dela Cruz", birthDate: "1990-05-01", sex: "M" },
      coverage: { payerId: "maxicare", memberId: "MX-123", planName: "Prima" },
      service: { code: "MRI-BRAIN", name: "MRI Brain", category: "imaging" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed birthDate", () => {
    const parsed = intakeInputSchema.safeParse({
      patient: { fullName: "X", birthDate: "05/01/1990", sex: "M" },
      coverage: { payerId: "p", memberId: "m", planName: "n" },
      service: { code: "c", name: "n", category: "imaging" },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("eligibilityResultSchema", () => {
  it("validates a well-formed result", () => {
    const parsed = eligibilityResultSchema.safeParse({
      status: "eligible",
      requirements: [],
      gaps: [],
      evidence: [],
      checkedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });
});
