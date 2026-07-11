import { describe, it, expect } from "vitest";
import type {
  IntakeInput,
  OrgId,
  UserId,
  EncounterId,
  Role,
  ProposedAction,
  ApprovalDecision,
} from "@helix/shared";
import { MockProvider } from "@helix/llm";
import { InMemoryAuditLog, AuthorizationError } from "@helix/core";
import { runEligibility, type EligibilityProposal } from "./eligibilityAgent";
import { approve } from "./approvalService";
import { InvalidTransitionError } from "./encounterState";
import type { ApprovalContext } from "./context";

const FIXED_NOW = new Date("2026-07-12T00:00:00.000Z");

function intake(): IntakeInput {
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
  };
}

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

async function makeProposal(): Promise<ProposedAction<EligibilityProposal>> {
  return runEligibility(intake(), {
    orgId: "org_demo" as OrgId,
    encounterId: "enc_1" as EncounterId,
    actor: { userId: "user_staff" as UserId, role: "staff" },
    llm: eligibleLLM(),
    audit: new InMemoryAuditLog(),
    payerMode: "mock",
    presentDocs: ["member_id", "valid_id"],
    now: () => FIXED_NOW,
    newId: (prefix: string) => `${prefix}_test`,
  });
}

function approvalCtx(
  role: Role = "staff",
  overrides: Partial<ApprovalContext> = {},
): ApprovalContext {
  return {
    orgId: "org_demo" as OrgId,
    encounterId: "enc_1" as EncounterId,
    encounterStatus: "awaiting_approval",
    actor: { userId: "user_approver" as UserId, role },
    audit: new InMemoryAuditLog(),
    payerMode: "mock",
    coverage: { memberId: "MX-0098-2231", planName: "Maxicare Prima" },
    serviceCategory: "imaging",
    now: () => FIXED_NOW,
    newId: (prefix: string) => `${prefix}_test`,
    ...overrides,
  };
}

function decision(
  kind: ApprovalDecision["kind"] = "approved",
): ApprovalDecision {
  return {
    by: "user_approver" as UserId,
    kind,
    at: FIXED_NOW.toISOString(),
  };
}

describe("approve — happy path", () => {
  it("submits the LOA, advances the encounter, and audits the decision", async () => {
    const proposal = await makeProposal();
    const ctx = approvalCtx("staff");

    const result = await approve(proposal, decision("approved"), ctx);

    expect(result.encounterStatus).toBe("approved");
    expect(result.loa.status).toBe("submitted");
    expect(result.submission).toBeDefined();
    expect(result.submission?.externalRef).toContain("MAXICARE-LOA-");

    const entries = ctx.audit.list({ orgId: ctx.orgId });
    const approvalEntry = entries.find((e) => e.action === "loa.approved");
    expect(approvalEntry).toBeDefined();
    expect(approvalEntry?.metadata?.decision).toBe("approved");
    expect(approvalEntry?.metadata?.loaStatus).toBe("submitted");
    expect(approvalEntry?.actorType).toBe("user");
  });
});

describe("approve — rejection", () => {
  it("denies the LOA and advances the encounter to rejected without submitting", async () => {
    const proposal = await makeProposal();
    const ctx = approvalCtx("admin");

    const result = await approve(proposal, decision("rejected"), ctx);

    expect(result.encounterStatus).toBe("rejected");
    expect(result.loa.status).toBe("denied");
    expect(result.submission).toBeUndefined();
  });
});

describe("approve — RBAC", () => {
  it("blocks a viewer from approving an LOA", async () => {
    const proposal = await makeProposal();
    const ctx = approvalCtx("viewer");

    await expect(approve(proposal, decision(), ctx)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("allows staff, admin, and owner to approve", async () => {
    for (const role of ["staff", "admin", "owner"] as const) {
      const proposal = await makeProposal();
      const result = await approve(proposal, decision(), approvalCtx(role));
      expect(result.encounterStatus).toBe("approved");
    }
  });
});

describe("approve — state machine", () => {
  it("refuses to approve an encounter that is not awaiting approval", async () => {
    const proposal = await makeProposal();
    const ctx = approvalCtx("staff", { encounterStatus: "intake" });

    await expect(approve(proposal, decision(), ctx)).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });
});
