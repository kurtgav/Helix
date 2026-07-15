import { describe, it, expect } from "vitest";
import type {
  ApprovalDecision,
  ClaimRecord,
  OrgId,
  PayerId,
  Role,
  UserId,
} from "@helix/shared";
import { InMemoryAuditLog, AuthorizationError } from "@helix/core";
import {
  runReceivables,
  resolveReceivables,
  scoreLedgerConfidence,
  RECEIVABLES_ACTION_KIND,
} from "./agent";
import type { ReceivablesContext } from "./context";

const FIXED_NOW = new Date("2026-07-12T00:00:00.000Z");

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

// A representative ledger: settlement history (so the forecast is measured),
// one on-track claim, and two overdue claims (₱10,000 + ₱4,000 = ₱14,000).
function ledger(): ClaimRecord[] {
  return [
    claim({
      id: "cl_hist",
      status: "paid",
      amountPaid: 10_000,
      submittedAt: "2026-04-01T08:00:00.000Z",
      decidedAt: "2026-04-21T08:00:00.000Z",
      ageDays: 100,
    }),
    claim({ id: "cl_open", ageDays: 10 }),
    claim({ id: "cl_over1", ageDays: 60 }),
    claim({
      id: "cl_over2",
      payerId: "philhealth" as PayerId,
      payerName: "PhilHealth",
      amountBilled: 4_000,
      submittedAt: "2026-04-15T08:00:00.000Z",
      status: "paid_partial",
      amountPaid: 0,
      ageDays: 80,
    }),
  ];
}

// cl_over2 is paid_partial with 0 paid — an underpayment, not an open overdue.
// Keep the overdue math simple: only cl_over1 (HMO, 60d > 45d window) and a
// PhilHealth OPEN claim below count as overdue.
function ledgerWithPhilhealthOverdue(): ClaimRecord[] {
  return [
    claim({
      id: "cl_hist",
      status: "paid",
      amountPaid: 10_000,
      submittedAt: "2026-04-01T08:00:00.000Z",
      decidedAt: "2026-04-21T08:00:00.000Z",
      ageDays: 100,
    }),
    claim({ id: "cl_open", ageDays: 10 }),
    claim({ id: "cl_over1", ageDays: 60 }),
    claim({
      id: "cl_over2",
      payerId: "philhealth" as PayerId,
      payerName: "PhilHealth",
      amountBilled: 4_000,
      submittedAt: "2026-04-15T08:00:00.000Z",
      ageDays: 70, // 10d past the verified 60d window
    }),
  ];
}

const OVERDUE_COUNT = 2;
const OVERDUE_AMOUNT = 14_000;

function makeCtx(
  role: Role = "staff",
  audit: InMemoryAuditLog = new InMemoryAuditLog(),
): ReceivablesContext {
  return {
    orgId: "org_demo" as OrgId,
    actor: { userId: "user_actor" as UserId, role },
    audit,
  };
}

function decision(
  kind: ApprovalDecision["kind"] = "approved",
): ApprovalDecision {
  return { by: "user_resolver" as UserId, kind, at: FIXED_NOW.toISOString() };
}

describe("runReceivables — proposal", () => {
  it("returns a receivables.review ProposedAction that requires approval", async () => {
    const action = await runReceivables(ledgerWithPhilhealthOverdue(), makeCtx());

    expect(action.kind).toBe(RECEIVABLES_ACTION_KIND);
    expect(action.requiresApproval).toBe(true);
    expect(action.proposal.claimCount).toBe(4);
    expect(action.proposal.findings).toHaveLength(4);
    expect(action.proposal.overdueCount).toBe(OVERDUE_COUNT);
    expect(action.proposal.overdueAmount).toBe(OVERDUE_AMOUNT);
    expect(action.proposal.scorecards.length).toBeGreaterThan(0);
    expect(action.proposal.forecast).toHaveLength(4);
    expect(action.rationale.toLowerCase()).toContain("human approval");
  });

  it("drafts a cited follow-up naming the overdue services and windows", async () => {
    const action = await runReceivables(ledgerWithPhilhealthOverdue(), makeCtx());

    expect(action.proposal.followUpDraft).toContain("MRI-BRAIN");
    expect(action.proposal.followUpDraft).toContain("PhilHealth");
    expect(action.proposal.followUpDraft).toContain("₱14,000.00");
    expect(action.proposal.followUpDraft).toContain("G.R. No. 214485");
  });

  it("attaches cited evidence: the policy anchor plus each payment rule in play", async () => {
    const action = await runReceivables(ledgerWithPhilhealthOverdue(), makeCtx());

    const sources = action.evidence.map((e) => e.source);
    expect(sources).toContain("policy:helix/receivables");
    expect(sources).toContain("reg:helix/hmo-claim-payment");
    expect(sources).toContain("reg:philhealth/philhealth-claim-payment");
    expect(action.evidence.some((e) => e.snippet !== undefined)).toBe(true);
  });

  it("is high-confidence with measured history; lower on rulebook-only forecasts", async () => {
    const measuredForAllPayers = await runReceivables(
      [
        claim({
          id: "h",
          status: "paid",
          amountPaid: 10_000,
          submittedAt: "2026-04-01T08:00:00.000Z",
          decidedAt: "2026-04-21T08:00:00.000Z",
          ageDays: 100,
        }),
        claim({ id: "o", ageDays: 10 }),
      ],
      makeCtx(),
    );
    expect(measuredForAllPayers.confidence).toBe(0.9);

    const noHistory = await runReceivables(
      [claim({ id: "only_open", ageDays: 10 })],
      makeCtx(),
    );
    expect(noHistory.confidence).toBe(0.7);
  });

  it("rejects a malformed ledger at the boundary", async () => {
    const malformed = [{ id: "", amountBilled: -5 }] as unknown as ClaimRecord[];
    await expect(runReceivables(malformed, makeCtx())).rejects.toThrow();
  });
});

describe("runReceivables — RBAC", () => {
  it("allows a viewer to review the ledger (read-only)", async () => {
    const action = await runReceivables(ledger(), makeCtx("viewer"));
    expect(action.kind).toBe(RECEIVABLES_ACTION_KIND);
  });
});

describe("runReceivables — audit hygiene", () => {
  it("records receivables.reviewed with citations only and no PHI", async () => {
    const audit = new InMemoryAuditLog();
    await runReceivables(ledgerWithPhilhealthOverdue(), makeCtx("staff", audit));

    const entries = audit.list({ orgId: "org_demo" as OrgId });
    const reviewed = entries.find((e) => e.action === "receivables.reviewed");
    expect(reviewed).toBeDefined();
    expect(reviewed?.actorType).toBe("agent");

    expect(reviewed?.metadata?.claimCount).toBe(4);
    expect(reviewed?.metadata?.overdueCount).toBe(OVERDUE_COUNT);
    expect(reviewed?.metadata?.overdueAmount).toBe(OVERDUE_AMOUNT);

    expect(reviewed?.evidence?.length).toBeGreaterThan(0);
    expect(reviewed?.evidence?.every((e) => e.snippet === undefined)).toBe(true);

    // Snippet text (rule summaries, policy blurbs) never lands in the
    // immutable trail — refs alone are the citation.
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain("baseline");
    expect(serialized).not.toContain("acted upon within");
  });
});

describe("resolveReceivables — human-in-the-loop gate", () => {
  it("blocks a viewer from resolving", async () => {
    const proposal = await runReceivables(ledgerWithPhilhealthOverdue(), makeCtx());

    await expect(
      resolveReceivables(proposal, decision("approved"), makeCtx("viewer")),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("on approval, confirms the overdue set and audits the decision", async () => {
    const audit = new InMemoryAuditLog();
    const proposal = await runReceivables(ledgerWithPhilhealthOverdue(), makeCtx());

    const result = await resolveReceivables(
      proposal,
      decision("approved"),
      makeCtx("staff", audit),
    );

    expect(result.followedUpCount).toBe(OVERDUE_COUNT);
    expect(result.amountChased).toBe(OVERDUE_AMOUNT);
    expect(result.decision.kind).toBe("approved");

    const resolved = audit
      .list({ orgId: "org_demo" as OrgId })
      .find((e) => e.action === "receivables.resolved");
    expect(resolved).toBeDefined();
    expect(resolved?.actorType).toBe("user");
    expect(resolved?.metadata?.decision).toBe("approved");
    expect(resolved?.metadata?.amountChased).toBe(OVERDUE_AMOUNT);
  });

  it("on rejection, chases nothing", async () => {
    const proposal = await runReceivables(ledgerWithPhilhealthOverdue(), makeCtx());

    const result = await resolveReceivables(
      proposal,
      decision("rejected"),
      makeCtx("admin"),
    );

    expect(result.followedUpCount).toBe(0);
    expect(result.amountChased).toBe(0);
  });

  it("does not mutate the proposal it resolves", async () => {
    const proposal = await runReceivables(ledger(), makeCtx());
    const before = JSON.stringify(proposal);

    await resolveReceivables(proposal, decision("approved"), makeCtx());

    expect(JSON.stringify(proposal)).toBe(before);
  });
});

describe("scoreLedgerConfidence", () => {
  it("is 0.9 when every payer has measured history", () => {
    expect(
      scoreLedgerConfidence({
        scorecards: [{ medianDaysToPay: 20 } as never],
      }),
    ).toBe(0.9);
  });

  it("drops to 0.7 when any payer forecasts on the rulebook default", () => {
    expect(
      scoreLedgerConfidence({
        scorecards: [
          { medianDaysToPay: 20 } as never,
          { medianDaysToPay: undefined } as never,
        ],
      }),
    ).toBe(0.7);
  });
});
