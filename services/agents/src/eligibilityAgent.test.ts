import { describe, it, expect } from "vitest";
import type {
  IntakeInput,
  OrgId,
  UserId,
  EncounterId,
  Role,
} from "@helix/shared";
import { MockProvider } from "@helix/llm";
import { InMemoryAuditLog, AuthorizationError } from "@helix/core";
import { runEligibility, scoreConfidence } from "./eligibilityAgent";
import type { EligibilityContext } from "./context";

const FIXED_NOW = new Date("2026-07-12T00:00:00.000Z");

// An eligible-answer LLM, grounded in the retrieved Maxicare imaging rule.
function eligibleLLM(): MockProvider {
  return new MockProvider({
    respondJson: () => ({
      status: "eligible",
      benefit: "Diagnostic imaging covered after LOA approval.",
      requirements: [],
      gaps: [],
      evidence: [{ source: "payer:maxicare/rules", ref: "#imaging" }],
      checkedAt: FIXED_NOW.toISOString(),
    }),
  });
}

function ineligibleLLM(): MockProvider {
  return new MockProvider({
    respondJson: () => ({
      status: "ineligible",
      requirements: [],
      gaps: [
        { kind: "coverage", message: "Membership inactive.", blocking: true },
      ],
      evidence: [{ source: "payer:maxicare/members", ref: "#MX-0044-7781" }],
      checkedAt: FIXED_NOW.toISOString(),
    }),
  });
}

function intake(overrides: Partial<IntakeInput> = {}): IntakeInput {
  return {
    patient: { fullName: "Juan Dela Cruz", birthDate: "1980-05-01", sex: "M" },
    coverage: {
      payerId: "maxicare",
      memberId: "MX-0098-2231",
      planName: "Maxicare Prima",
    },
    service: {
      code: "MRI-BRAIN",
      name: "MRI of the Brain",
      category: "imaging",
    },
    ...overrides,
  };
}

function makeCtx(
  llm: MockProvider,
  role: Role = "staff",
  overrides: Partial<EligibilityContext> = {},
): EligibilityContext {
  return {
    orgId: "org_demo" as OrgId,
    encounterId: "enc_1" as EncounterId,
    actor: { userId: "user_staff" as UserId, role },
    llm,
    audit: new InMemoryAuditLog(),
    payerMode: "mock",
    presentDocs: ["member_id", "valid_id"],
    now: () => FIXED_NOW,
    newId: (prefix: string) => `${prefix}_test`,
    ...overrides,
  };
}

describe("runEligibility — eligible MRI", () => {
  it("returns an eligible determination with a drafted LOA, a referral gap, and requiresApproval", async () => {
    const ctx = makeCtx(eligibleLLM());

    const action = await runEligibility(intake(), ctx);

    expect(action.kind).toBe("eligibility.result");
    expect(action.requiresApproval).toBe(true);
    expect(action.confidence).toBeGreaterThanOrEqual(0.5);

    const { eligibility, loa } = action.proposal;
    expect(eligibility.status).toBe("eligible");

    // Exactly one open gap — the missing referral (LOA is drafted, not "missing").
    expect(eligibility.gaps).toHaveLength(1);
    expect(eligibility.gaps[0]?.kind).toBe("referral");

    // LOA is a draft, requires the referral, and cites administrative evidence.
    expect(loa.status).toBe("draft");
    expect(loa.serviceCode).toBe("MRI-BRAIN");
    expect(loa.missingDocs.some((d) => d.toLowerCase().includes("referral"))).toBe(true);
    expect(loa.body).toContain("LETTER OF AUTHORIZATION");
    expect(action.evidence.length).toBeGreaterThan(0);
  });

  it("audits eligibility.checked and loa.drafted (no raw PHI)", async () => {
    const ctx = makeCtx(eligibleLLM());

    await runEligibility(intake(), ctx);

    const entries = ctx.audit.list({ orgId: ctx.orgId });
    const actions = entries.map((e) => e.action);
    expect(actions).toContain("eligibility.checked");
    expect(actions).toContain("loa.drafted");

    // The patient's name must never appear in the audit trail.
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain("Juan Dela Cruz");
  });
});

describe("runEligibility — inactive member", () => {
  it("returns ineligible for an inactive Maxicare member", async () => {
    const ctx = makeCtx(ineligibleLLM());

    const action = await runEligibility(
      intake({
        coverage: {
          payerId: "maxicare",
          memberId: "MX-0044-7781",
          planName: "Maxicare Prima",
        },
      }),
      ctx,
    );

    expect(action.proposal.eligibility.status).toBe("ineligible");
    expect(action.requiresApproval).toBe(true);
  });
});

describe("runEligibility — low confidence", () => {
  it("downgrades to needs_review when the LLM disagrees with the adapter", async () => {
    // Default MockProvider answers needs_review; adapter says eligible → disagreement.
    const ctx = makeCtx(new MockProvider());

    const action = await runEligibility(intake(), ctx);

    expect(action.proposal.eligibility.status).toBe("needs_review");
    expect(action.confidence).toBeLessThan(0.5);
  });
});

describe("runEligibility — RBAC", () => {
  it("blocks a viewer from running eligibility", async () => {
    const ctx = makeCtx(eligibleLLM(), "viewer");

    await expect(runEligibility(intake(), ctx)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

describe("runEligibility — LLM PHI minimization", () => {
  it("never sends the member ID or patient name to the LLM", async () => {
    // Capture every request the agent sends to the model.
    const seen: string[] = [];
    const recordingLLM = new MockProvider({
      respondJson: (req) => {
        seen.push(`${req.system ?? ""}\n${req.prompt}`);
        return {
          status: "eligible",
          requirements: [],
          gaps: [],
          evidence: [{ source: "payer:maxicare/rules", ref: "#imaging" }],
          checkedAt: FIXED_NOW.toISOString(),
        };
      },
    });

    const secretMemberId = "MX-SECRET-42";
    const secretName = "Maria Clara Santos";
    await runEligibility(
      intake({
        patient: { fullName: secretName, birthDate: "1980-05-01", sex: "F" },
        coverage: {
          payerId: "maxicare",
          memberId: secretMemberId,
          planName: "Maxicare Prima",
        },
      }),
      makeCtx(recordingLLM),
    );

    expect(seen.length).toBeGreaterThan(0);
    const allPrompts = seen.join("\n");
    // Minimum-necessary: neither the member ID nor the patient name may leave
    // the region to a 3rd-party model.
    expect(allPrompts).not.toContain(secretMemberId);
    expect(allPrompts).not.toContain(secretName);
    // Sanity: the model still receives the non-sensitive context it needs.
    expect(allPrompts).toContain("MRI-BRAIN");
  });
});

describe("scoreConfidence", () => {
  it("is high when a decided adapter answer agrees with the LLM and evidence exists", () => {
    expect(
      scoreConfidence({
        adapterStatus: "eligible",
        llmStatus: "eligible",
        evidenceCount: 3,
      }),
    ).toBeGreaterThanOrEqual(0.5);
  });

  it("is low when the LLM disagrees", () => {
    expect(
      scoreConfidence({
        adapterStatus: "eligible",
        llmStatus: "needs_review",
        evidenceCount: 3,
      }),
    ).toBeLessThan(0.5);
  });

  it("is low for an undecided adapter answer", () => {
    expect(
      scoreConfidence({
        adapterStatus: "needs_review",
        llmStatus: "needs_review",
        evidenceCount: 1,
      }),
    ).toBeLessThan(0.5);
  });
});
