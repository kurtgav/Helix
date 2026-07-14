import { describe, it, expect } from "vitest";
import type { DenialCase, PayerId } from "@helix/shared";
import { triageDenials, REVENUE_POLICY_SOURCE } from "./triage";
import { draftResubmission } from "./draft";

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

// A mixed batch: one recoverable claim, one write-off (aged-out eligibility),
// and one non-recoverable benefit exclusion.
function mixedBatch(): DenialCase[] {
  return [
    denial({
      id: "recoverable",
      reason: "missing_loa",
      serviceCode: "LAB-CBC",
      serviceName: "Complete Blood Count",
      amount: 1_200,
    }),
    denial({
      id: "writeoff",
      reason: "eligibility_lapsed",
      ageDays: 40, // past the 30-day window → write_off
      serviceCode: "WRITEOFF-XRAY",
      serviceName: "Chest X-Ray",
      amount: 800,
    }),
    denial({
      id: "excluded",
      reason: "service_not_covered",
      serviceCode: "EXCLUDED-DERM",
      serviceName: "Cosmetic Dermatology",
      amount: 2_500,
    }),
  ];
}

describe("draftResubmission — recoverable claims only", () => {
  it("lists each recoverable claim with its count, total, and fixes", () => {
    const cases = mixedBatch();
    const findings = triageDenials(cases);

    const note = draftResubmission(findings, cases);

    // Only ONE claim is recoverable in this batch.
    expect(note).toContain("1 claim(s)");
    // Total recoverable equals the single recoverable claim's amount.
    expect(note).toContain("₱1,200.00");
    // The recoverable claim and its administrative fixes appear.
    expect(note).toContain("LAB-CBC — Complete Blood Count");
    expect(note).toContain("obtain LOA / pre-auth");
    expect(note).toContain("attach approval reference");
  });

  it("excludes write-offs and non-recoverable claims from the resubmit list", () => {
    const cases = mixedBatch();
    const findings = triageDenials(cases);

    const note = draftResubmission(findings, cases);

    // The aged-out write-off never appears in the "to resubmit" note.
    expect(note).not.toContain("WRITEOFF-XRAY");
    expect(note).not.toContain("Chest X-Ray");
    // Neither does the non-recoverable benefit exclusion.
    expect(note).not.toContain("EXCLUDED-DERM");
    expect(note).not.toContain("Cosmetic Dermatology");
  });

  it("cites the Helix policy source and requires human approval", () => {
    const cases = mixedBatch();
    const note = draftResubmission(triageDenials(cases), cases);

    expect(note).toContain(REVENUE_POLICY_SOURCE);
    expect(note.toLowerCase()).toContain("human approval");
  });

  it("sums pesos across multiple recoverable claims", () => {
    const cases: DenialCase[] = [
      denial({ id: "a", reason: "missing_loa", amount: 10_000 }),
      denial({ id: "b", reason: "coding_mismatch", amount: 2_500 }),
    ];

    const note = draftResubmission(triageDenials(cases), cases);

    expect(note).toContain("2 claim(s)");
    expect(note).toContain("₱12,500.00");
  });
});

describe("draftResubmission — nothing recoverable", () => {
  it("returns a coherent note stating no claims are recoverable", () => {
    const cases: DenialCase[] = [
      denial({ id: "d", reason: "duplicate_claim", serviceCode: "DUP-1", amount: 400 }),
      denial({ id: "e", reason: "other", serviceCode: "OTHER-1", amount: 600 }),
    ];

    const note = draftResubmission(triageDenials(cases), cases);

    expect(note.toLowerCase()).toContain("no claims");
    expect(note).toContain("₱0.00");
    // Non-recoverable claims are not enumerated as resubmissions.
    expect(note).not.toContain("DUP-1");
    expect(note).not.toContain("OTHER-1");
    expect(note).toContain(REVENUE_POLICY_SOURCE);
  });
});
