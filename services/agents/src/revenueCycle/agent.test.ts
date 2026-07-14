import { describe, it, expect } from "vitest";
import type {
  DenialCase,
  OrgId,
  UserId,
  PayerId,
  Role,
  ApprovalDecision,
} from "@helix/shared";
import { InMemoryAuditLog, AuthorizationError } from "@helix/core";
import {
  runRevenueCycle,
  resolveRevenueCycle,
  scoreTriageConfidence,
  REVENUE_CYCLE_ACTION_KIND,
} from "./agent";
import type { RevenueCycleContext } from "./context";

const FIXED_NOW = new Date("2026-07-12T00:00:00.000Z");

function denial(overrides: Partial<DenialCase> = {}): DenialCase {
  return {
    id: "case_1",
    payerId: "maxicare" as PayerId,
    serviceCode: "LAB-CBC",
    serviceName: "Complete Blood Count",
    amount: 5_000,
    reason: "missing_loa",
    deniedAt: "2026-06-01T00:00:00.000Z",
    ageDays: 10,
    ...overrides,
  };
}

// A representative batch: two recoverable (₱10,000 + ₱2,500 = ₱12,500) and two
// not (a benefit exclusion + an aged-out eligibility lapse → write-off).
function batch(): DenialCase[] {
  return [
    denial({ id: "r1", reason: "missing_loa", amount: 10_000 }),
    denial({ id: "r2", reason: "coding_mismatch", amount: 2_500 }),
    denial({ id: "n1", reason: "service_not_covered", amount: 3_000 }),
    denial({ id: "n2", reason: "eligibility_lapsed", ageDays: 40, amount: 800 }),
  ];
}

const RECOVERABLE_COUNT = 2;
const TOTAL_RECOVERABLE = 12_500;
const CASE_COUNT = 4;

function makeCtx(
  role: Role = "staff",
  audit: InMemoryAuditLog = new InMemoryAuditLog(),
): RevenueCycleContext {
  return {
    orgId: "org_demo" as OrgId,
    actor: { userId: "user_actor" as UserId, role },
    audit,
    now: () => FIXED_NOW,
    newId: (prefix: string) => `${prefix}_test`,
  };
}

function decision(
  kind: ApprovalDecision["kind"] = "approved",
): ApprovalDecision {
  return { by: "user_resolver" as UserId, kind, at: FIXED_NOW.toISOString() };
}

describe("runRevenueCycle — proposal", () => {
  it("returns a revenue.triage ProposedAction that requires approval", async () => {
    const action = await runRevenueCycle(batch(), makeCtx("staff"));

    expect(action.kind).toBe(REVENUE_CYCLE_ACTION_KIND);
    expect(action.requiresApproval).toBe(true);
    expect(action.proposal.caseCount).toBe(CASE_COUNT);
    expect(action.proposal.findings).toHaveLength(CASE_COUNT);
    expect(action.proposal.recoverableCount).toBe(RECOVERABLE_COUNT);
    expect(action.proposal.totalRecoverable).toBe(TOTAL_RECOVERABLE);
    expect(action.rationale.toLowerCase()).toContain("human approval");
  });

  it("drafts a cited note naming the recoverable services", async () => {
    const action = await runRevenueCycle(batch(), makeCtx("staff"));

    expect(action.proposal.draftMessage).toContain("LAB-CBC");
    expect(action.proposal.draftMessage).toContain("₱12,500.00");
  });

  it("attaches cited evidence: the policy anchor plus a per-payer appeal ref", async () => {
    const action = await runRevenueCycle(batch(), makeCtx("staff"));

    const sources = action.evidence.map((e) => e.source);
    expect(sources).toContain("policy:helix/revenue-cycle");
    expect(sources).toContain("payer:maxicare/appeals");
    // Full evidence (with snippets) flows to the UI.
    expect(action.evidence.some((e) => e.snippet !== undefined)).toBe(true);
  });

  it("is high-confidence when every claim classified; lower when any is 'other'", async () => {
    const classified = await runRevenueCycle(batch(), makeCtx("staff"));
    expect(classified.confidence).toBe(0.9);

    const withOther = await runRevenueCycle(
      [...batch(), denial({ id: "u1", reason: "other" })],
      makeCtx("staff"),
    );
    expect(withOther.confidence).toBe(0.6);
  });
});

describe("runRevenueCycle — RBAC", () => {
  it("allows a viewer to review a triage (read-only)", async () => {
    // revenue.review is granted to viewers — reviewing is not the privileged step.
    const action = await runRevenueCycle(batch(), makeCtx("viewer"));
    expect(action.kind).toBe(REVENUE_CYCLE_ACTION_KIND);
  });
});

describe("runRevenueCycle — audit hygiene", () => {
  it("records revenue.reviewed with citations only and no PHI", async () => {
    const audit = new InMemoryAuditLog();
    await runRevenueCycle(batch(), makeCtx("staff", audit));

    const entries = audit.list({ orgId: "org_demo" as OrgId });
    const reviewed = entries.find((e) => e.action === "revenue.reviewed");
    expect(reviewed).toBeDefined();
    expect(reviewed?.actorType).toBe("agent");

    // Metadata carries safe aggregates only.
    expect(reviewed?.metadata?.caseCount).toBe(CASE_COUNT);
    expect(reviewed?.metadata?.recoverableCount).toBe(RECOVERABLE_COUNT);
    expect(reviewed?.metadata?.totalRecoverable).toBe(TOTAL_RECOVERABLE);

    // Citations only — every stored evidence item is stripped of its snippet.
    expect(reviewed?.evidence?.length).toBeGreaterThan(0);
    expect(reviewed?.evidence?.every((e) => e.snippet === undefined)).toBe(true);

    // The snippet text never lands in the immutable trail.
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain("baseline");
    expect(serialized).not.toContain("appeals & resubmission");
  });
});

describe("resolveRevenueCycle — human-in-the-loop gate", () => {
  it("blocks a viewer from resolving", async () => {
    const proposal = await runRevenueCycle(batch(), makeCtx("staff"));

    await expect(
      resolveRevenueCycle(proposal, decision("approved"), makeCtx("viewer")),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("on approval, recovers the recoverable set and audits the decision", async () => {
    const audit = new InMemoryAuditLog();
    const proposal = await runRevenueCycle(batch(), makeCtx("staff"));

    const result = await resolveRevenueCycle(
      proposal,
      decision("approved"),
      makeCtx("staff", audit),
    );

    expect(result.resolvedCount).toBe(RECOVERABLE_COUNT);
    expect(result.totalRecovered).toBe(TOTAL_RECOVERABLE);
    expect(result.decision.kind).toBe("approved");

    const resolved = audit
      .list({ orgId: "org_demo" as OrgId })
      .find((e) => e.action === "revenue.resolved");
    expect(resolved).toBeDefined();
    expect(resolved?.actorType).toBe("user");
    expect(resolved?.metadata?.decision).toBe("approved");
    expect(resolved?.metadata?.totalRecovered).toBe(TOTAL_RECOVERABLE);
  });

  it("on rejection, recovers nothing", async () => {
    const proposal = await runRevenueCycle(batch(), makeCtx("staff"));

    const result = await resolveRevenueCycle(
      proposal,
      decision("rejected"),
      makeCtx("admin"),
    );

    expect(result.resolvedCount).toBe(0);
    expect(result.totalRecovered).toBe(0);
    expect(result.decision.kind).toBe("rejected");
  });

  it("does not mutate the proposal it resolves", async () => {
    const proposal = await runRevenueCycle(batch(), makeCtx("staff"));
    const before = JSON.stringify(proposal);

    await resolveRevenueCycle(proposal, decision("approved"), makeCtx("staff"));

    expect(JSON.stringify(proposal)).toBe(before);
  });
});

describe("scoreTriageConfidence", () => {
  it("is 0.9 when no finding is unclassified", () => {
    expect(
      scoreTriageConfidence([
        { reason: "missing_loa" } as never,
        { reason: "coding_mismatch" } as never,
      ]),
    ).toBe(0.9);
  });

  it("drops to 0.6 when any finding is 'other'", () => {
    expect(
      scoreTriageConfidence([
        { reason: "missing_loa" } as never,
        { reason: "other" } as never,
      ]),
    ).toBe(0.6);
  });
});
