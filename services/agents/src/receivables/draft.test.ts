import { describe, it, expect } from "vitest";
import type { ClaimRecord, PayerId } from "@helix/shared";
import { assessReceivables } from "./ledger";
import { draftFollowUp } from "./draft";

function claim(overrides: Partial<ClaimRecord> & { id: string }): ClaimRecord {
  return {
    payerId: "maxicare" as PayerId,
    payerName: "Maxicare",
    serviceCode: "HD-SESSION",
    serviceName: "Hemodialysis session",
    amountBilled: 4_200,
    submittedAt: "2026-05-01T08:00:00.000Z",
    status: "submitted",
    ageDays: 60, // 15d past the 45d HMO default
    ...overrides,
  };
}

describe("draftFollowUp", () => {
  it("lists only overdue claims, grouped per payer with the governing citation", () => {
    const rows = [
      claim({ id: "over_hmo" }),
      claim({
        id: "over_ph",
        payerId: "philhealth" as PayerId,
        payerName: "PhilHealth",
        serviceCode: "CBC",
        serviceName: "Complete Blood Count (CBC)",
        amountBilled: 850,
        ageDays: 70, // 10d past the verified 60d window
      }),
      claim({ id: "young", ageDays: 5 }), // on track — must not appear
    ];
    const draft = draftFollowUp(assessReceivables(rows), rows);

    expect(draft).toContain("Maxicare (1 claim(s), ₱4,200.00 outstanding)");
    expect(draft).toContain("PhilHealth (1 claim(s), ₱850.00 outstanding)");
    expect(draft).toContain("HD-SESSION — Hemodialysis session");
    expect(draft).toContain("AHMOPI");
    expect(draft).toContain("G.R. No. 214485");
    expect(draft).toContain("₱5,050.00");
    expect(draft).toContain("human approval");
    // The on-track claim is excluded — no premature demands.
    expect(draft.match(/HD-SESSION/g)).toHaveLength(1);
  });

  it("asserts a follow-up, never an entitlement", () => {
    const rows = [claim({ id: "over" })];
    const draft = draftFollowUp(assessReceivables(rows), rows);
    expect(draft).toContain("status follow-up, not a demand");
    expect(draft).toContain("under formal investigation");
  });

  it("says plainly when nothing is overdue", () => {
    const rows = [claim({ id: "young", ageDays: 3 })];
    const draft = draftFollowUp(assessReceivables(rows), rows);
    expect(draft).toContain("Nothing to chase");
    expect(draft).not.toContain("HD-SESSION");
  });

  it("is deterministic", () => {
    const rows = [claim({ id: "a" }), claim({ id: "b", ageDays: 90 })];
    const findings = assessReceivables(rows);
    expect(draftFollowUp(findings, rows)).toBe(draftFollowUp(findings, rows));
  });
});
