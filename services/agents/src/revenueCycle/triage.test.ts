import { describe, it, expect } from "vitest";
import type { DenialCase, DenialReason, PayerId } from "@helix/shared";
import {
  triageDenials,
  assessRisk,
  formatPesos,
  REVENUE_POLICY_SOURCE,
} from "./triage";

// A neutral base claim. Amount/age here land in the "medium" risk tier and do
// NOT trip either age gate, so per-reason tests isolate the classification.
function denial(overrides: Partial<DenialCase> = {}): DenialCase {
  return {
    id: "case_1",
    payerId: "maxicare" as PayerId,
    serviceCode: "MRI-BRAIN",
    serviceName: "MRI of the Brain",
    amount: 5_000,
    reason: "missing_loa",
    deniedAt: "2026-06-01T00:00:00.000Z",
    ageDays: 10,
    ...overrides,
  };
}

// Triage one claim and return its single finding.
function triageOne(overrides: Partial<DenialCase> = {}) {
  const [finding] = triageDenials([denial(overrides)]);
  if (!finding) throw new Error("expected a finding");
  return finding;
}

describe("triageDenials — reason classification", () => {
  it("eligibility_lapsed within the window → contact_payer, recoverable", () => {
    const finding = triageOne({ reason: "eligibility_lapsed", ageDays: 10 });

    expect(finding.recommendedAction).toBe("contact_payer");
    expect(finding.recoverable).toBe(true);
    expect(finding.requiredFixes).toEqual([
      "confirm active coverage window",
      "re-verify member eligibility",
    ]);
  });

  it("missing_loa → correct_and_resubmit, recoverable", () => {
    const finding = triageOne({ reason: "missing_loa" });

    expect(finding.recommendedAction).toBe("correct_and_resubmit");
    expect(finding.recoverable).toBe(true);
    expect(finding.requiredFixes).toEqual([
      "obtain LOA / pre-auth",
      "attach approval reference",
    ]);
  });

  it("missing_document → correct_and_resubmit, recoverable", () => {
    const finding = triageOne({ reason: "missing_document" });

    expect(finding.recommendedAction).toBe("correct_and_resubmit");
    expect(finding.recoverable).toBe(true);
    expect(finding.requiredFixes).toEqual([
      "attach referral",
      "attach doctor's request",
    ]);
  });

  it("service_not_covered → appeal, not recoverable", () => {
    const finding = triageOne({ reason: "service_not_covered" });

    expect(finding.recommendedAction).toBe("appeal");
    expect(finding.recoverable).toBe(false);
    expect(finding.requiredFixes).toEqual([
      "cite plan benefit schedule",
      "request benefit exception",
    ]);
  });

  it("coding_mismatch → correct_and_resubmit, recoverable", () => {
    const finding = triageOne({ reason: "coding_mismatch" });

    expect(finding.recommendedAction).toBe("correct_and_resubmit");
    expect(finding.recoverable).toBe(true);
    expect(finding.requiredFixes).toEqual([
      "correct service/diagnosis coding",
      "align to payer code set",
    ]);
  });

  it("late_filing within the window → appeal, recoverable", () => {
    const finding = triageOne({ reason: "late_filing", ageDays: 30 });

    expect(finding.recommendedAction).toBe("appeal");
    expect(finding.recoverable).toBe(true);
    expect(finding.requiredFixes).toEqual([
      "file timeliness appeal with justification",
    ]);
  });

  it("duplicate_claim → resubmit, not recoverable", () => {
    const finding = triageOne({ reason: "duplicate_claim" });

    expect(finding.recommendedAction).toBe("resubmit");
    expect(finding.recoverable).toBe(false);
    expect(finding.requiredFixes).toEqual([
      "void duplicate",
      "confirm single submission",
    ]);
  });

  it("other → contact_payer, not recoverable", () => {
    const finding = triageOne({ reason: "other" });

    expect(finding.recommendedAction).toBe("contact_payer");
    expect(finding.recoverable).toBe(false);
    expect(finding.requiredFixes).toEqual(["manual review with payer"]);
  });

  it("classifies all eight reasons without gaps", () => {
    const reasons: DenialReason[] = [
      "eligibility_lapsed",
      "missing_loa",
      "missing_document",
      "service_not_covered",
      "coding_mismatch",
      "late_filing",
      "duplicate_claim",
      "other",
    ];

    const findings = triageDenials(
      reasons.map((reason, i) => denial({ id: `case_${i}`, reason, ageDays: 5 })),
    );

    expect(findings).toHaveLength(reasons.length);
    findings.forEach((finding, i) => {
      expect(finding.caseId).toBe(`case_${i}`);
      expect(finding.reason).toBe(reasons[i]);
      expect(finding.requiredFixes.length).toBeGreaterThan(0);
      expect(finding.rationale).toContain(REVENUE_POLICY_SOURCE);
    });
  });
});

describe("triageDenials — payer-aware recovery windows", () => {
  it("HMO eligibility_lapsed flips to write_off past the 30-day contractual window", () => {
    const recoverable = triageOne({ reason: "eligibility_lapsed", ageDays: 30 });
    const lapsed = triageOne({ reason: "eligibility_lapsed", ageDays: 31 });

    // Boundary (inclusive): 30 days is still recoverable.
    expect(recoverable.recoverable).toBe(true);
    expect(recoverable.recommendedAction).toBe("contact_payer");

    // Past the window: not recoverable, action becomes write_off.
    expect(lapsed.recoverable).toBe(false);
    expect(lapsed.recommendedAction).toBe("write_off");
  });

  it("HMO late_filing flips to write_off past the 30-day contractual window", () => {
    const recoverable = triageOne({ reason: "late_filing", ageDays: 30, amount: 100 });
    const lapsed = triageOne({ reason: "late_filing", ageDays: 31, amount: 100 });

    expect(recoverable.recoverable).toBe(true);
    expect(recoverable.recommendedAction).toBe("appeal");

    expect(lapsed.recoverable).toBe(false);
    expect(lapsed.recommendedAction).toBe("write_off");
  });

  it("PhilHealth denials get the verified 15-day motion-for-reconsideration window", () => {
    const philhealth = { payerId: "philhealth" as PayerId };
    const recoverable = triageOne({ ...philhealth, reason: "late_filing", ageDays: 15, amount: 100 });
    const lapsed = triageOne({ ...philhealth, reason: "late_filing", ageDays: 16, amount: 100 });

    expect(recoverable.recoverable).toBe(true);
    expect(recoverable.recommendedAction).toBe("appeal");
    expect(recoverable.deadline!.ruleRef).toBe("reg:philhealth/philhealth-appeal");

    expect(lapsed.recoverable).toBe(false);
    expect(lapsed.recommendedAction).toBe("write_off");
  });

  it("PhilHealth correctable claims ride the verified 60-day RTH refile window", () => {
    const philhealth = { payerId: "philhealth" as PayerId };
    const within = triageOne({ ...philhealth, reason: "missing_document", ageDays: 60 });
    const past = triageOne({ ...philhealth, reason: "coding_mismatch", ageDays: 61 });

    expect(within.recoverable).toBe(true);
    expect(within.recommendedAction).toBe("correct_and_resubmit");
    expect(within.deadline!.kind).toBe("refile");
    expect(within.deadline!.ruleRef).toBe("reg:philhealth/philhealth-rth-refile");

    expect(past.recoverable).toBe(false);
    expect(past.recommendedAction).toBe("write_off");
  });

  it("HMO fixed-recoverability reasons ignore age entirely (no published refile window)", () => {
    const young = triageOne({ reason: "missing_loa", ageDays: 1 });
    const old = triageOne({ reason: "missing_loa", ageDays: 999 });
    const oldDoc = triageOne({ reason: "missing_document", ageDays: 999 });

    expect(young.recoverable).toBe(true);
    expect(old.recoverable).toBe(true);
    expect(old.recommendedAction).toBe("correct_and_resubmit");
    expect(oldDoc.recoverable).toBe(true);
    expect(oldDoc.deadline).toBeUndefined();
  });
});

describe("triageDenials — deadline assessments", () => {
  it("attaches the reconsideration deadline to governed reasons", () => {
    const finding = triageOne({
      reason: "eligibility_lapsed",
      deniedAt: "2026-07-01T00:00:00.000Z",
      ageDays: 10,
    });

    expect(finding.deadline).toBeDefined();
    expect(finding.deadline!.kind).toBe("appeal");
    expect(finding.deadline!.basis).toBe("2026-07-01");
    expect(finding.deadline!.deadline).toBe("2026-07-31"); // +30d (HMO default)
    expect(finding.deadline!.daysRemaining).toBe(20);
    expect(finding.deadline!.urgency).toBe("open");
    expect(finding.rationale).toContain("2026-07-31");
  });

  it("marks urgency tiers from days remaining", () => {
    const critical = triageOne({ reason: "late_filing", ageDays: 25 }); // 5d left
    const soon = triageOne({ reason: "late_filing", ageDays: 18 }); // 12d left
    const expired = triageOne({ reason: "late_filing", ageDays: 40 }); // -10d

    expect(critical.deadline!.urgency).toBe("critical");
    expect(soon.deadline!.urgency).toBe("soon");
    expect(expired.deadline!.urgency).toBe("expired");
  });

  it("attaches an informational deadline to service_not_covered without gating", () => {
    const finding = triageOne({ reason: "service_not_covered", ageDays: 5 });

    expect(finding.deadline).toBeDefined();
    expect(finding.recoverable).toBe(false);
    expect(finding.recommendedAction).toBe("appeal");
  });

  it("leaves clock-independent reasons without a deadline", () => {
    expect(triageOne({ reason: "missing_loa" }).deadline).toBeUndefined();
    expect(triageOne({ reason: "duplicate_claim" }).deadline).toBeUndefined();
    expect(triageOne({ reason: "other" }).deadline).toBeUndefined();
  });
});

describe("assessRisk — risk tiers", () => {
  it("is high when amount ≥ 10000 or age ≥ 45 days", () => {
    expect(assessRisk(10_000, 0)).toBe("high");
    expect(assessRisk(0, 45)).toBe("high");
    expect(assessRisk(50_000, 90)).toBe("high");
  });

  it("is medium when amount ≥ 3000 or age ≥ 20 days (and not high)", () => {
    expect(assessRisk(3_000, 0)).toBe("medium");
    expect(assessRisk(0, 20)).toBe("medium");
    expect(assessRisk(9_999, 44)).toBe("medium");
  });

  it("is low below both medium thresholds", () => {
    expect(assessRisk(2_999, 19)).toBe("low");
    expect(assessRisk(0, 0)).toBe("low");
  });

  it("surfaces the risk tier on the finding", () => {
    expect(triageOne({ amount: 12_000, ageDays: 1 }).risk).toBe("high");
    expect(triageOne({ amount: 3_500, ageDays: 1 }).risk).toBe("medium");
    expect(triageOne({ amount: 100, ageDays: 1 }).risk).toBe("low");
  });
});

describe("triageDenials — finding shape & immutability", () => {
  it("sets amountAtRisk to the claim amount and a cited rationale", () => {
    const finding = triageOne({ amount: 7_250, reason: "missing_loa" });

    expect(finding.amountAtRisk).toBe(7_250);
    expect(finding.rationale).toContain("correct_and_resubmit");
    expect(finding.rationale).toContain(REVENUE_POLICY_SOURCE);
    expect(finding.rationale.toLowerCase()).toContain("risk");
  });

  it("returns a fresh requiredFixes array that callers cannot leak back into policy", () => {
    const first = triageOne({ reason: "missing_loa" });
    // Mutating one finding's list must not affect a subsequent triage.
    first.requiredFixes.push("SHOULD NOT PERSIST");

    const second = triageOne({ reason: "missing_loa" });
    expect(second.requiredFixes).toEqual([
      "obtain LOA / pre-auth",
      "attach approval reference",
    ]);
  });

  it("preserves input order across a batch", () => {
    const findings = triageDenials([
      denial({ id: "a", reason: "missing_loa" }),
      denial({ id: "b", reason: "duplicate_claim" }),
      denial({ id: "c", reason: "other" }),
    ]);

    expect(findings.map((f) => f.caseId)).toEqual(["a", "b", "c"]);
  });
});

describe("formatPesos", () => {
  it("groups thousands and always shows two decimals", () => {
    expect(formatPesos(0)).toBe("0.00");
    expect(formatPesos(1_500)).toBe("1,500.00");
    expect(formatPesos(1_234_567.5)).toBe("1,234,567.50");
  });
});
