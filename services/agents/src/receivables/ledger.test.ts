import { describe, it, expect } from "vitest";
import type { ClaimRecord, PayerId } from "@helix/shared";
import {
  assessReceivables,
  buildScorecards,
  forecastCashflow,
  ledgerAsOf,
  RECEIVABLES_POLICY_SOURCE,
} from "./ledger";

// Deterministic fixture ledger. Ages are relative to each claim's own
// submittedAt + ageDays (the same wall-clock-free device as denial triage), so
// the same input always assesses identically.
function claim(overrides: Partial<ClaimRecord> & { id: string }): ClaimRecord {
  return {
    payerId: "maxicare" as PayerId,
    payerName: "Maxicare",
    serviceCode: "MRI-BRAIN",
    serviceName: "MRI (Brain, plain)",
    amountBilled: 10_000,
    submittedAt: "2026-06-01T08:00:00.000Z",
    status: "submitted",
    ageDays: 10,
    ...overrides,
  };
}

describe("assessReceivables — standings against the payer's own clock", () => {
  it("keeps a young claim on_track with a cited payment deadline", () => {
    const [finding] = assessReceivables([claim({ id: "cl_1", ageDays: 5 })]);
    expect(finding!.standing).toBe("on_track");
    expect(finding!.amountOutstanding).toBe(10_000);
    expect(finding!.daysOutstanding).toBe(5);
    expect(finding!.deadline).toBeDefined();
    expect(finding!.deadline!.kind).toBe("payer_payment");
    expect(finding!.deadline!.daysRemaining).toBe(40); // HMO default 45d − 5d
    expect(finding!.rationale).toContain(RECEIVABLES_POLICY_SOURCE);
  });

  it("flags due_soon inside the urgency window and overdue past the deadline", () => {
    const findings = assessReceivables([
      claim({ id: "cl_soon", ageDays: 33 }), // 12d left on the 45d HMO window
      claim({ id: "cl_over", ageDays: 60 }), // 15d past the window
    ]);
    expect(findings[0]!.standing).toBe("due_soon");
    expect(findings[1]!.standing).toBe("overdue");
    expect(findings[1]!.deadline!.daysRemaining).toBe(-15);
    expect(findings[1]!.rationale).toContain("reg:helix/hmo-claim-payment");
  });

  it("uses the verified 60-day PhilHealth window for philhealth claims", () => {
    const [finding] = assessReceivables([
      claim({
        id: "cl_ph",
        payerId: "philhealth" as PayerId,
        payerName: "PhilHealth",
        ageDays: 70,
      }),
    ]);
    expect(finding!.standing).toBe("overdue");
    expect(finding!.deadline!.daysRemaining).toBe(-10);
    expect(finding!.rationale).toContain("reg:philhealth/philhealth-claim-payment");
  });

  it("marks full payments settled and short payments underpaid with the shortfall", () => {
    const findings = assessReceivables([
      claim({
        id: "cl_paid",
        status: "paid",
        amountPaid: 10_000,
        decidedAt: "2026-06-20T08:00:00.000Z",
      }),
      claim({
        id: "cl_short",
        status: "paid_partial",
        amountPaid: 7_500,
        decidedAt: "2026-06-25T08:00:00.000Z",
      }),
    ]);
    expect(findings[0]!.standing).toBe("settled");
    expect(findings[0]!.amountOutstanding).toBe(0);
    expect(findings[0]!.deadline).toBeUndefined();
    expect(findings[1]!.standing).toBe("underpaid");
    expect(findings[1]!.amountOutstanding).toBe(2_500);
  });

  it("routes denied claims out of the receivable path with zero outstanding", () => {
    const [finding] = assessReceivables([claim({ id: "cl_den", status: "denied" })]);
    expect(finding!.standing).toBe("denied");
    expect(finding!.amountOutstanding).toBe(0);
    expect(finding!.rationale).toContain("Revenue Cycle");
  });

  it("is deterministic — same ledger, same findings", () => {
    const rows = [claim({ id: "cl_a", ageDays: 33 }), claim({ id: "cl_b" })];
    expect(assessReceivables(rows)).toEqual(assessReceivables(rows));
  });
});

describe("buildScorecards — measured payer behavior", () => {
  const ledger: ClaimRecord[] = [
    // Maxicare: two decided on time, no shortfall, nothing overdue → A.
    claim({
      id: "mx_1",
      status: "paid",
      amountPaid: 10_000,
      submittedAt: "2026-05-01T08:00:00.000Z",
      decidedAt: "2026-05-21T08:00:00.000Z", // 20d
      ageDays: 60,
    }),
    claim({
      id: "mx_2",
      status: "paid",
      amountPaid: 4_000,
      amountBilled: 4_000,
      submittedAt: "2026-05-10T08:00:00.000Z",
      decidedAt: "2026-06-03T08:00:00.000Z", // 24d
      ageDays: 50,
    }),
    claim({ id: "mx_3", ageDays: 10 }), // open, on track
    // MedGuard PLUS: late, short, and overdue → D territory.
    claim({
      id: "mg_1",
      payerId: "medguard" as PayerId,
      payerName: "MedGuard PLUS",
      status: "paid_partial",
      amountPaid: 5_000,
      submittedAt: "2026-04-01T08:00:00.000Z",
      decidedAt: "2026-05-26T08:00:00.000Z", // 55d — past the 30d default
      ageDays: 90,
    }),
    claim({
      id: "mg_2",
      payerId: "medguard" as PayerId,
      payerName: "MedGuard PLUS",
      ageDays: 50, // 5d past the 45d default window
    }),
    claim({
      id: "mg_3",
      payerId: "medguard" as PayerId,
      payerName: "MedGuard PLUS",
      status: "denied",
      decidedAt: "2026-06-10T08:00:00.000Z",
      ageDays: 40,
    }),
  ];

  it("aggregates totals, overdue exposure, and behavior rates per payer", () => {
    const findings = assessReceivables(ledger);
    const cards = buildScorecards(ledger, findings);
    expect(cards.map((card) => card.payerId)).toEqual(["maxicare", "medguard"]);

    const maxicare = cards[0]!;
    expect(maxicare.claimCount).toBe(3);
    expect(maxicare.totalBilled).toBe(24_000);
    expect(maxicare.totalPaid).toBe(14_000);
    expect(maxicare.totalOutstanding).toBe(10_000);
    expect(maxicare.overdueCount).toBe(0);
    expect(maxicare.medianDaysToPay).toBe(22); // median(20, 24)
    expect(maxicare.onTimeRate).toBe(1);
    expect(maxicare.shortfallRate).toBe(0);
    expect(maxicare.grade).toBe("A");

    const medguard = cards[1]!;
    expect(medguard.overdueCount).toBe(1);
    expect(medguard.overdueAmount).toBe(10_000);
    expect(medguard.medianDaysToPay).toBe(55);
    expect(medguard.onTimeRate).toBe(0);
    expect(medguard.shortfallRate).toBe(1);
    expect(medguard.denialRate).toBe(0.5);
    expect(medguard.grade).toBe("D");
  });

  it("caps a payer with overdue money below A even with a clean paid history", () => {
    const rows = [
      claim({
        id: "ok_1",
        status: "paid",
        amountPaid: 10_000,
        submittedAt: "2026-05-01T08:00:00.000Z",
        decidedAt: "2026-05-15T08:00:00.000Z",
        ageDays: 60,
      }),
      claim({ id: "ok_2", ageDays: 50 }), // 5d past the 45d window
    ];
    const cards = buildScorecards(rows, assessReceivables(rows));
    expect(cards[0]!.grade).toBe("B");
  });

  it("leaves behavior rates undefined when a payer has no decided claims", () => {
    const rows = [claim({ id: "new_1", ageDays: 3 })];
    const [card] = buildScorecards(rows, assessReceivables(rows));
    expect(card!.medianDaysToPay).toBeUndefined();
    expect(card!.onTimeRate).toBeUndefined();
    expect(card!.denialRate).toBeUndefined();
  });

  it("grades exactly on the B boundary without float drift (½ on-time, no shortfall → B)", () => {
    // 0.7·0.5 + 0.3·1 = 0.65 mathematically, 0.6499999… in binary float —
    // this payer must read B, not C.
    const rows = [
      claim({
        id: "b_1",
        status: "paid",
        amountPaid: 10_000,
        submittedAt: "2026-03-01T08:00:00.000Z",
        decidedAt: "2026-03-21T08:00:00.000Z", // 20d — on time
        ageDays: 130,
      }),
      claim({
        id: "b_2",
        status: "paid",
        amountPaid: 10_000,
        submittedAt: "2026-03-01T08:00:00.000Z",
        decidedAt: "2026-04-25T08:00:00.000Z", // 55d — late
        ageDays: 130,
      }),
    ];
    const [card] = buildScorecards(rows, assessReceivables(rows));
    expect(card!.onTimeRate).toBe(0.5);
    expect(card!.grade).toBe("B");
  });
});

describe("forecastCashflow — expected collections from observed behavior", () => {
  it("projects open claims into week buckets using the payer's median days-to-pay", () => {
    const rows: ClaimRecord[] = [
      // History: Maxicare pays in ~20 days.
      claim({
        id: "h1",
        status: "paid",
        amountPaid: 8_000,
        amountBilled: 8_000,
        submittedAt: "2026-05-01T08:00:00.000Z",
        decidedAt: "2026-05-21T08:00:00.000Z",
        ageDays: 61,
      }),
      // Open claim submitted 2026-06-26, today = 2026-07-01 → expected 2026-07-16 (day 15).
      claim({ id: "o1", submittedAt: "2026-06-26T08:00:00.000Z", ageDays: 5 }),
    ];
    const findings = assessReceivables(rows);
    const cards = buildScorecards(rows, findings);
    const forecast = forecastCashflow(rows, cards);
    expect(forecast).toHaveLength(4);
    const total = forecast.reduce((sum, bucket) => sum + bucket.expectedAmount, 0);
    expect(total).toBe(10_000);
    // Day 15 falls in the 15–30d bucket.
    expect(forecast[2]!.expectedAmount).toBe(10_000);
    expect(forecast[2]!.claimCount).toBe(1);
  });

  it("drops already-overdue money into the first bucket (chase now)", () => {
    const rows = [claim({ id: "od", ageDays: 50 })];
    const forecast = forecastCashflow(rows, buildScorecards(rows, assessReceivables(rows)));
    expect(forecast[0]!.expectedAmount).toBe(10_000);
  });

  it("returns zeroed buckets when nothing is open", () => {
    const rows = [
      claim({
        id: "p",
        status: "paid",
        amountPaid: 10_000,
        decidedAt: "2026-06-20T08:00:00.000Z",
      }),
    ];
    const forecast = forecastCashflow(rows, buildScorecards(rows, assessReceivables(rows)));
    expect(forecast.every((bucket) => bucket.expectedAmount === 0)).toBe(true);
  });
});

describe("ledgerAsOf", () => {
  it("derives the deterministic as-of date from the oldest claim clock", () => {
    const rows = [
      claim({ id: "a", submittedAt: "2026-06-01T08:00:00.000Z", ageDays: 10 }),
      claim({ id: "b", submittedAt: "2026-06-20T08:00:00.000Z", ageDays: 5 }),
    ];
    expect(ledgerAsOf(rows)).toBe("2026-06-25");
  });
});
